import os, sys, inspect, json, random, string
from flask import Flask, render_template, jsonify, request, url_for, send_file
import pickle
import pandas as pd
from flask_cors import CORS
from geopy.distance import geodesic
import numpy as np
import boto3
import gzip
import shutil
import json
from flask import request

application = Flask(__name__)
CORS(application, resources={r"/*": {"origins": "*"}})
application.config['CORS_HEADERS'] = 'Content-Type'
static_file_dir = os.path.dirname(os.path.realpath(__file__)) + '/static'
global NUM_STOPS
global total_fuel_usage_pred
global incident_quartile_pred

@application.route("/")
def hello():
    # return render_template('main.html')
    return render_template('index.html')

@application.route("/get_num_stops")
def get_num_stops():
    total_dist = request.args.get('dist')
    num_stops = calc_num_stops(float(total_dist))
    print("NUM STOPS TO RETURN IS ", num_stops)
    return jsonify(num_ev_stops=num_stops)

def add_geo_zone(row):
    GEO_ZONES = [(34.038047, -118.274621),
             (34.047099, -118.268039),
             (34.051926, -118.260303),
             (34.056548, -118.256655),
             (34.061561, -118.250572),
             (34.066321, -118.241543),
             (34.086138, -118.232075),
             (34.094257, -118.242364),
             (34.100011, -118.247934),
             (34.116331, -118.268914)]
    MAX_DIST_IN_MILES = 0.5
    row_lat = row['latitude']
    row_lon = row['longitude']
    if row_lat and row_lon:
        for idx, coords in enumerate(GEO_ZONES):
            if geodesic(coords, (row_lat,row_lon)).miles <= MAX_DIST_IN_MILES:
                return idx
    return 99    

def get_aws_data():
    print("Getting AWS connected vehicle data ...")
    s3_resource = boto3.resource('s3')
    s3_client = boto3.client('s3')
    bucket_name = "ashwinawss3bucket"
    my_key = "telemetry/2019/11/07/00/connected-vehicle-telemetry-1-2019-11-07-00-51-52-ed786c56-a6f6-43de-a1b8-c860d6bb0472.gz"
    my_bucket_name = "connected-vehicle-data-us-east-1-869647407607"
    s3_client.download_file(Bucket=my_bucket_name, Key=my_key, Filename='mytempdata.gz')
    with gzip.open('mytempdata.gz', 'rb') as f_in:
        with open('mytempdata.json', 'wb') as f_out:
            shutil.copyfileobj(f_in, f_out)
    
    aws_connected_df = pd.read_json('mytempdata.json', orient='columns', lines=True)
    the_objects = []
    for line in open('mytempdata.json', 'r'):
        the_objects.append(json.loads(line))

    # We need to get the columns to be that information
    # and the row index will be the timestamp
    df_dict = {}
    for o in the_objects:
        ts = o['timestamp']
        if o['name'] != 'location':
            if ts in df_dict:
                df_dict[ts][o['name']] = o['value']
            else:
                df_dict[ts] = {}
                df_dict[ts][o['name']] = o['value']

    aws_connected_df = pd.DataFrame.from_dict(df_dict, orient='index')
    aws_fuel_only = aws_connected_df[aws_connected_df['fuel_level'] > 0]
    m = aws_connected_df.iloc[:, 5].ge(0.0)
    cumgrp = m.cumsum()[~m]
    grps = aws_connected_df[~m].groupby(cumgrp)
    list_of_groups = [g for n, g in grps]
    fuel_used_rows = aws_connected_df[m]
    all_dicts = list()
    for i in range(len(list_of_groups)-1):
        engine_speed_avg = list_of_groups[i]['engine_speed'].mean()
        vehicle_speed_avg = list_of_groups[i]['vehicle_speed'].mean()
        torque_at_transmission_avg = list_of_groups[i]['torque_at_transmission'].mean()
        acceleration_avg = list_of_groups[i]['vehicle_speed'].mean()
        fuel_used = fuel_used_rows.iloc[i,5]
        group_dict = {
            'engine_speed_avg': engine_speed_avg,
            'vehicle_speed_avg': vehicle_speed_avg,
            'torque_at_transmission_avg': torque_at_transmission_avg,
            'acceleration_avg': acceleration_avg,
            'fuel_used': fuel_used
        }
        all_dicts.append(group_dict)
    aws_usable_df = pd.DataFrame(all_dicts)
    aws_usable_df.dropna(inplace=True)
    X_aws = aws_usable_df[['acceleration_avg', 'engine_speed_avg',
       'torque_at_transmission_avg', 'vehicle_speed_avg']].copy()
    return X_aws.iloc[0].values.reshape(1,-1)

def predict_incident_quartile(clf, route_data):
    # Route data needs to be array to be in format [ (lat,lon,timecategory)]
    # Convert route data into X
        # Convert lat/lon 
    rdf = pd.DataFrame(route_data, columns=['latitude','longitude','time_category'])
    rdf['geo_zone'] = rdf.apply(lambda row: add_geo_zone(row), axis=1)
    rdf_X = rdf[['geo_zone','time_category']].copy()
    rdf_preds = clf.predict(rdf_X)
    predicted_incident_quartile_avg = rdf_preds.mean()
    return predicted_incident_quartile_avg

def calc_num_stops(dist):
    vehicleDefaultRange = 300.0 # default of 300 miles
    if total_fuel_usage_pred > 3.0 and total_fuel_usage_pred < 6.0:
        if incident_quartile_pred > 1.0 and incident_quartile_pred < 2.0:
            vehicleDefaultRange = 300.0
    elif incident_quartile_pred > 1.0 and incident_quartile_pred < 2.0:
        vehicleDefaultRange = 270.0
    elif incident_quartile_pred < 1.0:
        vehicleDefaultRange = 350.0
    elif incident_quartile_pred > 2.0:
        vehicleDefaultRange = 220.0
    elif total_fuel_usage_pred < 3.0:
        vehicleDefaultRange = 325.0
    else:
        vehicleDefaultRange = 300.0
    import math
    return math.floor(dist / vehicleDefaultRange)

def setup_models():
    global total_fuel_usage_pred
    global incident_quartile_pred
    incident_model = pickle.load(open('incident_model.sav','rb'))
    aws_model = pickle.load(open('aws_model.sav','rb'))
    aws_scaler = pickle.load(open('aws_scaler.sav','rb'))
    sirius_fuel_eff_model = pickle.load(open('sirius_fuel_eff_model.sav','rb'))
    sirius_fuel_eff_scaler = pickle.load(open('sirius_fuel_eff_scaler.sav','rb'))
    route_data = [(34.038047, -118.274621, 2),
             (34.047099, -118.268039, 2),
             (34.051926, -118.260303, 2),
             (34.056548, -118.256655, 2),
             (34.061561, -118.250572, 2),
             (34.066321, -118.241543, 2),
             (34.086138, -118.232075, 2),
             (34.094257, -118.242364, 2),
             (34.100011, -118.247934, 2),
             (34.116331, -118.268914, 2)]

    # Would be coming from SiriusXM in real time
    fuel_eff_x = np.array([ 708.66666667,2.5,1384.33333333,34.0,88.83333333,132.0]).reshape(1,-1)

    # AWS Connected Vehicle Data
    aws_connected_data_x = get_aws_data()
    print("Finished getting AWS data")

    # Predictions

    # Quartile of incidents likely to occur on this route
    incident_quartile_pred = predict_incident_quartile(incident_model, route_data)

    # Fuel usage prediction from AWS connected data
    scaled_AWS = aws_scaler.transform(aws_connected_data_x)
    aws_fuel_usage_prediction = aws_model.predict(scaled_AWS)

    # Fuel usage prediction from Sirius connected data
    sirius_data_x = sirius_fuel_eff_scaler.transform(fuel_eff_x)
    sirius_fuel_usage_prediction = sirius_fuel_eff_model.predict(sirius_data_x)

    total_fuel_usage_pred = aws_fuel_usage_prediction[0] + sirius_fuel_usage_prediction[0]

if __name__ == "__main__":
    setup_models()
    application.run()





























    


























    


























