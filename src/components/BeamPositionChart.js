import { css, html, throttle, repeat } from "../HelperFunctions.js";

const styling = css`
:host {
    display: inline-block;
    width: 100%;
}
`

export default class BeamPositionChart extends HTMLElement {
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this.root.innerHTML = this.template();

        this.limit = 0;

        this.attachChart();
    }

    attachChart(){
        this.chart = Highcharts.chart({
            chart: {
                renderTo: this.root.querySelector("#container"),
                reflow: true,
                animation: false,
                height: 300
            },

            credits: {
                enabled: false
            },

            title: {
                text: "Separation",
            },

            yAxis: {
                title: {
                    text: "Beam position [mm]"
                }
            },

            xAxis: {
                title: {
                    text: "Time [s]"
                }
            },

            exporting: {
                enabled: false
            },

            plotOptions: {
                area: {
                    marker: {
                        enabled: false,
                        states: {
                            hover: {
                                enabled: false
                            }
                        }
                    }
                }
            },
        
            series: [{
                type: "line",
                name: 'Beam 1',
                data: [],
                color: "hsl(0, 70%, 70%)"
            }, {
                type: "line",
                name: 'Beam 2',
                data: [],
                color: "hsl(240, 70%, 70%)"
            }, {
                type: "area",
                name: null,
                showInLegend: false,
                threshold: Infinity,
                showInNavigator: false,
                data: [],
                color: "rgb(154, 154, 154)"
            }, {
                type: "area",
                name: null,
                showInLegend: false,
                showInNavigator: false,
                threshold: -Infinity,
                data: [],
                color: "rgb(154, 154, 154)"
            }
        ]
        });
    }

    /**
     * @param {number} newLimit
     */
    updateLimits(newLimit){
        this.chart.series[2].setData(
            [
                [0, newLimit],
                [this.maxTime, newLimit]
            ]
        )

        this.chart.series[3].setData(
            [
                [0, -newLimit],
                [this.maxTime, -newLimit]
            ]
        )

        this.limit = newLimit;
    }

    /**
     * @param {[number, number][][]} newData
     */
    updateData(newData){
        this.chart.series[0].setData(newData[0]);
        this.chart.series[1].setData(newData[1]);

        this.maxTime = newData[0].slice(-1)[0][0]

        this.updateLimits(this.limit);
    }

    connectedCallback(){
        this.reflow();
    }

    async reflow(){
        throttle(() => {
            this.chart.reflow()
        }, 100, "beam-position-throttle");
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
customElements.define('beam-position-chart', BeamPositionChart);