# Editor for LHC VdM Scans

An code and file editor for VdM scans.

## Local Development

* Create the file `/secrets.json` with the format `{"token": <TOKEN>}`.
* Install all the dev dependencies: `npm install`.
* Run a http server: `npm run-script test-server`.

For testing:
* Open 127.0.0.1:8080/SpecRunner.html
* To test specific files, you can use the spec parameter e.g. `127.0.0.1:8080/SpecRunner.html?spec=CodeEditor`

For viewing the editor locally:
* Open 127.0.0.1:8080/index.html