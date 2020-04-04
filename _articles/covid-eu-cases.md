---
layout: articles
title:  "SARS-COV-2/COVID-19 Confirmed Cases in Europe"
date: 2020-03-01 #2014-08-27T11:57:41-04:00
modified: 2020-03-01
subtitle: "Collecting official SARS-CoV-2 data using GitHub Actions"
authors:
- id: covid19-eu-zh
comments: true
types:
- 'dataset'
category:
- GitHub
tag:
- 'GitHub Actions'
summary: covid19-eu-zh/covid19-eu-data is an automated COVID-19 confirmed cases data collection experiment using GitHub Actions.
dataset:
  - id: covid19_eu_data
charts: true
references:
  - name: "Automated Data Collection: COVID-19/SARS-COV-2 Cases in EU by Country, State/Province/Local Authorities, and Date"
    link: https://github.com/covid19-eu-zh/covid19-eu-data
---

The [covid19-eu-zh/covid19-eu-data](https://github.com/covid19-eu-zh/covid19-eu-data) repository is an experiment of data scraping and aggregation using GitHub Actions.

> covid19-eu-zh is a dynamic and energetic team. Please consider follow their [telegram channel for COVID-19 in Europe in Chinese](https://t.me/s/covid19_eu_zh_c).

## The Dataset

The dataset is being updated regularly.[^1]

![](https://img.shields.io/github/last-commit/covid19-eu-zh/covid19-eu-data/master) ![](https://img.shields.io/github/commit-activity/w/covid19-eu-zh/covid19-eu-data)

The following is a table showing the update status and data sources.

| Country | Status | Data Source |
| ------------- | ------------- | --- |
| AT | ![CI Download AT Data](https://github.com/covid19-eu-zh/covid19-eu-data/workflows/CI%20Download%20AT%20Data/badge.svg) | [![](https://img.shields.io/badge/Data%20Source-sozialministerium.at-informational)](https://www.sozialministerium.at/Informationen-zum-Coronavirus/Neuartiges-Coronavirus-(2019-nCov).html) |
| BE | ![CI Download BE PDF](https://github.com/covid19-eu-zh/covid19-eu-data/workflows/CI%20Download%20BE%20PDF/badge.svg) | [![](https://img.shields.io/badge/Data%20Source-epidemio.wiv--isp.be-informational)](https://epidemio.wiv-isp.be/ID/Pages/2019-nCoV_epidemiological_situation.aspx) |
| CH | ![CI Download CH Data](https://github.com/covid19-eu-zh/covid19-eu-data/workflows/CI%20Download%20CH%20Data/badge.svg) | [![](https://img.shields.io/badge/Data%20Source-epidemio.wiv--daenuprobst/covid19--cases--switzerland-informational)](https://github.com/daenuprobst/covid19-cases-switzerland) |
| CZ | ![CI Download CZ Data](https://github.com/covid19-eu-zh/covid19-eu-data/workflows/CI%20Download%20CZ%20Data/badge.svg) | [![](https://img.shields.io/badge/Data%20Source-onemocneni--aktualne.mzcr.cz-informational)](https://onemocneni-aktualne.mzcr.cz/covid-19) |
| DE | ![CI Download DE SARS-COV-2 Cases from RKI](https://github.com/covid19-eu-zh/covid19-eu-data/workflows/CI%20Download%20DE%20SARS-COV-2%20Cases%20from%20RKI/badge.svg) | [![](https://img.shields.io/badge/Data%20Source-rki.de-informational)](https://www.rki.de/DE/Content/InfAZ/N/Neuartiges_Coronavirus/Fallzahlen.html) |
| DK  | ![CI Download DK PDF](https://github.com/covid19-eu-zh/covid19-eu-data/workflows/CI%20Download%20DK%20PDF/badge.svg)  | [![](https://img.shields.io/badge/Data%20Source-ssi.dk-informational)](https://www.ssi.dk/aktuelt/sygdomsudbrud/coronavirus/covid-19-i-danmark-epidemiologisk-overvaagningsrapport) |
| ES  | ![CI Download ES PDF Files](https://github.com/covid19-eu-zh/covid19-eu-data/workflows/CI%20Download%20ES%20PDF%20Files/badge.svg)  | [![](https://img.shields.io/badge/Data%20Source-mscbs.gob.es-informational)](http://www.mscbs.gob.es/profesionales/saludPublica/ccayes/alertasActual/nCov-China/situacionActual.htm) |
| FR  | ![CI Download FR Data](https://github.com/covid19-eu-zh/covid19-eu-data/workflows/CI%20Download%20FR%20Data/badge.svg) | [![](https://img.shields.io/badge/Data%20Source-santepubliquefrance.fr-informational)](https://www.santepubliquefrance.fr/maladies-et-traumatismes/maladies-et-infections-respiratoires/infection-a-coronavirus/articles/infection-au-nouveau-coronavirus-sars-cov-2-covid-19-france-et-monde) |
| IT | ![CI Download IT Data](https://github.com/covid19-eu-zh/covid19-eu-data/workflows/CI%20Download%20IT%20Data/badge.svg) | [![](https://img.shields.io/badge/Data%20Source-pcm--dpc/COVID--19-informational)](https://github.com/pcm-dpc/COVID-19/blob/master/dati-json/dpc-covid19-ita-province-latest.json) |
| NL | ![CI Download NL SARS-COV-2 Cases from volksgezondheidenzorg](https://github.com/covid19-eu-zh/covid19-eu-data/workflows/CI%20Download%20NL%20SARS-COV-2%20Cases%20from%20volksgezondheidenzorg/badge.svg) | [![](https://img.shields.io/badge/Data%20Source-volksgezondheidenzorg.info-informational)](https://www.volksgezondheidenzorg.info/onderwerp/infectieziekten/regionaal-internationaal/coronavirus-covid-19#node-coronavirus-covid-19-meldingen) |
| NO | ![CI Download NO Data](https://github.com/covid19-eu-zh/covid19-eu-data/workflows/CI%20Download%20NO%20Data/badge.svg) | [![](https://img.shields.io/badge/Data%20Source-fhi.no-informational)](https://www.fhi.no/en/id/infectious-diseases/coronavirus/daily-reports/daily-reports-COVID19/) |
| PL | ![CI Download PL Data](https://github.com/covid19-eu-zh/covid19-eu-data/workflows/CI%20Download%20PL%20Data/badge.svg) | [![](https://img.shields.io/badge/Data%20Source-gov.pl-informational)](https://www.gov.pl/web/koronawirus/wykaz-zarazen-koronawirusem-sars-cov-2) |
| SE | ![CI Download SE](https://github.com/covid19-eu-zh/covid19-eu-data/workflows/CI%20Download%20SE/badge.svg) | [![](https://img.shields.io/badge/Data%20Source-folkhalsomyndigheten.se-informational)](https://www.folkhalsomyndigheten.se/smittskydd-beredskap/utbrott/aktuella-utbrott/covid-19/aktuellt-epidemiologiskt-lage/)  |
| UK | ![CI Download England Data](https://github.com/covid19-eu-zh/covid19-eu-data/workflows/CI%20Download%20England%20Data/badge.svg)  ![CI Download Scotland Data](https://github.com/covid19-eu-zh/covid19-eu-data/workflows/CI%20Download%20Scotland%20Data/badge.svg)  ![CI Download Wales Data](https://github.com/covid19-eu-zh/covid19-eu-data/workflows/CI%20Download%20Wales%20Data/badge.svg)  | [![](https://img.shields.io/badge/Data%20Source-official_arcgis-informational)](https://www.arcgis.com/sharing/rest/content/items/b684319181f94875a6879bbc833ca3a6/data) [![](https://img.shields.io/badge/Data%20Source-gov.scot-informational)](https://www.gov.scot/coronavirus-covid-19/) [![](https://img.shields.io/badge/Data%20Source-phw.nhs.wales-informational)](https://phw.nhs.wales/news/public-health-wales-statement-on-novel-coronavirus-outbreak/) [![](https://img.shields.io/badge/Data%20Source-publichealth.hscni.net-informational)](https://www.publichealth.hscni.net/news/covid-19-coronavirus#situation-in-northern-ireland) |
| EU(ECDC) | ![CI Download All EU from ECDC](https://github.com/covid19-eu-zh/covid19-eu-data/workflows/CI%20Download%20All%20EU%20from%20ECDC/badge.svg) |  [![](https://img.shields.io/badge/Data%20Source-ecdc.europa.eu-informational)](https://www.ecdc.europa.eu/en/cases-2019-ncov-eueea) |


### A Demo: Confirmed Cases in Germany

The data can be directly loaded into your applications. Here is a simple demo using the data file for Germany. Please refer to [`/flora/covid19_eu_data/` (link to the dataset)](/flora/covid19_eu_data/) for the data files of all available countries.

<script>
function diff(ary) {
    var newA = [];
    for (var i = 1; i < ary.length; i++)  newA.push( ary[i] - ary[i - 1] )
    return newA;
}

function element_diff(arrA,arrB) {
    var newA = [];
    for (var i = 1; i < arrA.length; i++)  newA.push( arrA[i]/arrB[i] )
    return newA;
}

de_url = "https://raw.githubusercontent.com/covid19-eu-zh/covid19-eu-data/master/dataset/covid-19-de.csv"

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}


function uniqueRegions(de_data) {
  return de_data.map(row => row.nuts_1 ).filter(onlyUnique)
}

function regionTraces (de_data, keyword) {

  de_total_cases = de_data.filter(row => (row.nuts_1 === keyword) && (new Date(row.datetime).getHours() == 15) ).map(row => row.cases);

  de_total_datetime = de_data.filter(row => (row.nuts_1 === keyword) && (new Date(row.datetime).getHours() == 15)).map(row => row.datetime);
  de_total_datetime_diff = diff(de_total_datetime.map(dt => new Date(dt))).map(dt => dt/(1000*60*60))
  de_total_cases_diff = diff(de_total_cases)

return {
  "cases": de_total_cases,
  "datetime": de_total_datetime,
  "diff": de_total_cases_diff
  }
}

Plotly.d3.csv(
  de_url, (err, de_data) => {

regions = uniqueRegions(de_data)
regions = regions.filter(el => (el != "sum"))
// regions.unshift("sum")
console.log(
  "all regions in germany: ",
  regions
)

function makePlot(region) {

  de_total = regionTraces(de_data, region)

  var trace_total = {
    x: de_total["datetime"],
    y: de_total["cases"],
    mode: 'markers',
    type: 'bar',
    name: `Total (${region})`
  };

  var trace_daily = {
    x: de_total["datetime"].slice(1,de_total_datetime.length),
    y: de_total["diff"],
    mode: 'markers+lines',
    yaxis: 'y2',
    type: 'line',
    name: `Daily (${region})`
  };

  var data = [
    trace_total, trace_daily
  ];

  var layout = {
    title: `SARS-COV-2 Confirmed Cases (${region})`,
    yaxis: {title: 'Total Confirmed Cases'},
    yaxis2: {
      title: 'Daily Confirmed Cases',
      titlefont: {color: 'rgb(148, 103, 189)'},
      tickfont: {color: 'rgb(148, 103, 189)'},
      overlaying: 'y',
      side: 'right'
    },
    legend: {"orientation": "h"}
  };

  Plotly.newPlot("de-cases", data, layout);
}

makePlot("Rheinland-Pfalz")


var innerContainer = document.querySelector('[data-num="0"'),
    plotEl = innerContainer.querySelector('.plot'),
    regionSelector = innerContainer.querySelector('.region');

function assignOptions(textArray, selector) {
  for (var i = 0; i < textArray.length;  i++) {
      var currentOption = document.createElement('option');
      currentOption.text = textArray[i];
      selector.appendChild(currentOption);
  }
}

assignOptions(regions, regionSelector);

function updateRegion(){
    makePlot(regionSelector.value);
}

regionSelector.addEventListener('change', updateRegion, false);

  }
)

</script>

<div id="barcharts">
    <div class="barcharts" data-num="0">
      <div class="control-row">
          Select Region: <select class="button region">
          </select>
        </div>
      <div class="plot" id="de-cases"></div>
    </div>
  </div>



<div id="de-cases-stacked"></div>

<script>

Plotly.d3.csv(
  de_url, (err, de_data) => {
    regions = uniqueRegions(de_data)

    var region_traces = regions.map(
      region => {
          de_total = regionTraces(de_data, region)
          return {
            x: de_total["datetime"],
            y: de_total["cases"],
            stackgroup: 'DE',
            name: `${region}`
          }
      }
    )

    var layout = {
      title: `SARS-COV-2 Confirmed Cases in Germany`,
      yaxis: {title: 'Total Confirmed Cases'},
      legend: {"orientation": "h"}
    };

    Plotly.newPlot('de-cases-stacked', region_traces, layout);

  }
)


</script>

## Data Collection

The structure of the project is as follows.

```
.
├── README.md
├── dataset     #where the data files lives
├── documents   #where the raw data and files lives
├── now.json    #zeit now setup for a FAAS service
├── scripts     #scripts to download and aggregate data
└── .dataherb   #where the metadata lives
```

### Scripts

We have a python script for each country for more flexible schedules of each country. We are using classes from `utils.py` so that the scripts have similar structures.

```
scripts
├── download_at.py
├── ...
├── requirements.txt
└── utils.py
```

### Dataset

The dataset folder contains the full dataset of each country and the daily pdates of each country.

```
dataset
├── covid-19-at.csv
├── ...
└── daily
    ├── at
    ├── ...
```

## GitHub Actions

We manage the pipelines using GitHub Actions. The full set of workflows is found in [the original repository](https://github.com/covid19-eu-zh/covid19-eu-data/actions).

We use Germany as an example. In the workflow for Germany, we have two triggers, pushing to master branch and schedule. The job steps are

1. Checkout the repository;
2. Setup python and install python requirements;
3. Run the python script to download and aggregate data;
4. Push data to repository.

{% highlight yaml %}
name: CI Download DE SARS-COV-2 Cases from RKI

on:
  push:
    branches:
      - master
  schedule:
    - cron:  '0 7/1 * * *'

jobs:
  build:

    runs-on: ubuntu-latest

    steps:
      - name: Checkout current repo
        uses: actions/checkout@v2
      - name: Get current directory and files
        run: |
          pwd
          ls
      - uses: actions/setup-python@v1
        with:
          python-version: '3.7' # Version range or exact version of a Python version to use, using SemVer's version range syntax
          architecture: 'x64' # optional x64 or x86. Defaults to x64 if not specified
      - name: Install Python Requirements
        run: |
          python --version
          pip install -r scripts/requirements.txt
      - name: Download Records
        run: |
          python scripts/download_de.py
          ls dataset/daily/de
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git pull
          git status
          git add .
          git commit -m "Update DE Dataset" || echo "Nothing to update"
          git status
      - name: Push changes
        uses: ad-m/github-push-action@master
        with:
          repository: covid19-eu-zh/covid19-eu-data
          github_token: {% raw  %}${{ secrets.GITHUB_TOKEN }}{% endraw  %}
{% endhighlight %}

## And Much More

We run a **Telegram Channel (in Chinese)**: [新冠肺炎欧洲中文臺](https://t.me/s/covid19_eu_zh_c)

[![Chat](http://img.shields.io/badge/telegram-covid19__eu__zh__c-blue.svg)](https://t.me/s/covid19_eu_zh_c)

**If you would like to help or track the progress of this project**, check out our roadmap.

[![](https://img.shields.io/badge/roadmap-data--pipeline-blueviolet)](https://github.com/orgs/covid19-eu-zh/projects/1)

[^1]: Some countries, such as Spain, we only download the record PDF files. Some countries, such as Italy, [provides open and well-organized data](https://github.com/pcm-dpc/COVID-19) by the government.
