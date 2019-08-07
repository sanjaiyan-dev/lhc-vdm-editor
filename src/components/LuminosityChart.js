import { css, html, throttle, deepCopy, deepMerge } from "../HelperFunctions.js";
import { commonChartOptions } from "./GenericChart.js"

const styling = css`
:host {
    display: inline-block;
    width: 100%;
}
`

export default class LuminosityChart extends HTMLElement {
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this.root.innerHTML = this.template();
        this.data = null;

        this.timeType = "real";

        this.attachChart();
    }

    attachChart(){
        this.chart = Highcharts.chart(deepMerge(deepCopy(commonChartOptions), /** @type {Highcharts.Options} */({
            chart: {
                height: 250,
                renderTo: this.root.querySelector("#container"),
            },

            title: {
                text: "Luminosity",
            },

            yAxis: {
                title: {
                    useHTML: true,
                    text: "Luminosity [Hz/mm<sup>2</sup>]",
                },
                type: 'linear'
            },

            xAxis: {
                title: {
                    text: "Real time [s]"
                }
            },

            legend: {
                enabled: false
            },
        
            series: [{
                type: "line",
                data: [],
            }]
        })));
    }

    /**
     * @param {[{realTime: number, sequenceTime: number}, number][]} newData
     */
    updateData(newData){
        this.data = newData;

        this.chart.series[0].setData(newData.map(
            x => [x[0][this.timeType + "Time"], x[1]]
        ));
    }

    refresh(){
        if(this.data == null) return;

        this.updateData(this.data);
    }
    
    /**
     * @param {string} newTimeType
     */
    setTimeType(newTimeType){
        this.timeType = newTimeType;

        this.chart.xAxis[0].setTitle({
            text: `${newTimeType[0].toUpperCase()}${newTimeType.slice(1)} time [s]`
        })

        this.refresh();
    }

    connectedCallback(){
        this.reflow();
    }

    async reflow(){
        throttle(() => {
            this.chart.reflow()
        }, 500, this, true);
    }

    setScale(newScale){
        this.chart.yAxis[0].update({
            type: newScale == "log" ? "logarithmic" : "linear"
        })
    }

    template() {
        return html`
        <style>
            ${styling}
        </style>
        <div id="container"></div>
    `
    }
}
customElements.define('luminosity-chart', LuminosityChart);