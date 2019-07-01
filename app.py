import pandas as pd
import json
import csv
from flask import Flask, render_template, redirect, jsonify 
df = pd.read_excel('Median_income_final.xls')

df_totalcharges = pd.read_csv('TotalCharges.csv')

df_totalcharges = df_totalcharges.merge(df, how = 'left', on ='State')

df_totalcharges = df_totalcharges[['State', 'Total Discharges', 'Average Covered Charges', 'Average Total Payments',
       'Average Medicare Payments', 'Medianincome_2016','Medianincome_2015']]
df_totalcharges.head()

df_totalcharges = df_totalcharges.groupby('State').first()
df_totalcharges = df_totalcharges.dropna()

df_totalcharges.to_csv(r'C:\Github\VisualizationProject\final_file.csv')

totalcharges = df_totalcharges.to_dict("list")

df_totalcharges.to_json (r'C:\Github\VisualizationProject\TotalCharges.json')

final_file_data_to_load = pd.read_csv("final_file.csv")
total_charges_data_to_load = pd.read_csv("TotalCharges.csv")

from flask import Flask, jsonify


app = Flask(__name__)



@app.route("/")
def index():
    return render_template("Choropleth.html")


@app.route("/jsonified")
def jsonified():
    return jsonify(totalcharges)


if __name__ == "__main__":
    app.run(debug=True)
