// NOTE: this needs to not have any imports, as we cannot use the ES6 import syntax here

export function calcLuminosity(sep, cross, sigma, sigmaZ, alpha, intensity, nbb) {
    // s - separation in separation plane - m
    // c - separation in crossing plane - m
    // sigma - m
    // alpha - crossing_angle - rad
    // sigmaZ - this.param.bunch_length - m
    // nbb - bunch_pair_collisions
    // intensity - nuclei per bunch

    const s2 = sigma ** 2;
    const sz2 = sigmaZ ** 2;
    const cos2 = Math.cos(alpha / 2) ** 2;
    const sin2 = Math.sin(alpha / 2) ** 2;

    const SigmaCross = Math.sqrt(2 * (s2 * cos2 + sz2 * sin2)); // effective size in crossing plane - m
    const SigmaSep = Math.sqrt(2 * s2); // effective size in separation plane - m

    const Ssep = Math.exp((-1 / 2) * (sep / SigmaSep) ** 2); // separation factor in separation plane
    const Scross = Math.exp((-1 / 2) * (cross / SigmaCross) ** 2); // separation factor in crossing plane
    const Lbb = lhc_constants.f_rev * cos2 * intensity ** 2 / (2 * Math.PI * SigmaCross * SigmaSep) * Ssep * Scross; // luminosity per bunch pair in Hz/m^2

    const L = nbb * Lbb; // luminosity in Hz/m^2
    return L * 1e-4; // luminosity in Hz/cm^2
}
export function isSubsetOf(arr1, arr2) {
    // returns true iff arr1 is a subset of arr2
    arr1 = typeof arr1 == 'string' ? [arr1] : Array.from(arr1);
    arr2 = typeof arr2 == 'string' ? [arr2] : Array.from(arr2);
    return arr1.every(x => arr2.includes(x))
}
/**
 * @param {string} str
 * @param {string} key
 * @returns {Array}
 */
export function getInnerBracket(str, key) {
    const match = str.match(new RegExp('^' + key + '\\((.*)\\)$'));
    if (!match) {
        throw `Expected ${key}(...) but got ${str}`
    }
    return match[1].split(',');
}
export function toProperUnits(beamParameters, IP) {
    return {
        "energy": beamParameters.energy, // GeV
        "particle_mass": beamParameters.particle_mass, // GeV
        "emittance": beamParameters.emittance, // m
        "beta_star": beamParameters.beta_star[IP], // m
        "crossing_angle": beamParameters.crossing_angle[IP], // rad
        "scan_limits": beamParameters.scan_limits[IP], // sigma
        "trim_rate": beamParameters.trim_rate * 1e-3, // m/s
        "intensity": beamParameters.intensity, // particles per bunch
        "bunch_pair_collisions": beamParameters.bunch_pair_collisions[IP],
        "bunch_length": beamParameters.bunch_length * 1e-3 // m
    };
}
export class VdMSyntaxError extends Error {
    /**
     * @param {number} linenumber
     * @param {string} message
     */
    constructor(linenumber, message) {
        super();
        this.line = linenumber;
        this.message = message;
    }
}


const lhc_constants = {
    f_rev: 11245, // Hz
    crossing_plane: {
        'IP1': "V",
        'IP2': "V",
        'IP5': "H",
        'IP8': "H"
    },
}
const validArguments = {
    IP: ['IP1', 'IP2', 'IP5', 'IP8'],
    BEAM: ['BEAM1', 'BEAM2'],
    PLANE: ['SEPARATION', 'CROSSING'],
    UNITS: ['SIGMA', 'MM'],
    FIT_TYPE: ['GAUSSIAN', 'GAUSSIAN_PLUS_CONSTANT']
}
/**
 * @param {Object} argsObj
 */
export function testArgs(argsObj) {
    /* expects:
    arrgsObj = {
        IP: [],
        BEAM: [],
        PLANE: [],
        UNITS: []
    } 
    all are optional*/
    for (const [key, value] of Object.entries(argsObj)) {
        if (!isSubsetOf(value, validArguments[key])) {
            throw `Invalid ${key} argument. Expected subset of {${validArguments[key]}} but got {${value}}`
        }
    }
    return true
}
export function toGraphPoint(command) {
    return [
        {
            realTime: command.realTime,
            sequenceTime: command.sequenceTime
        },
        command.luminosity
    ]
}
export function linspace(start, end, num, includeEnd = true) {
    if (!Number.isInteger(num) || num < 1) throw new Error('Number has to be an integer grater than 0');

    const dist = (end - start) / (includeEnd ? num - 1 : num);
    let result = new Array(num);

    result[0] = start;
    for (let i = 1; i < num - 1; i++) {
        result[i] = result[i - 1] + dist
    }
    if (includeEnd) result[num - 1] = end;

    return result
}




/**
 * @param {Array} args
 */
export function checkTrimArgs(args) {
    if (args.length == 0 || args.length % 5 != 0) throw 'Command has to include arguments: IP BEAM PLANE AMOUNT UNIT';
    for (let i = 0; i < args.length; i += 5) {
        const currentArgs = {
            IP: args[i],
            BEAM: args[i + 1],
            PLANE: args[i + 2],
            UNITS: args[i + 4]
        };
        testArgs(currentArgs);
        if (!isFinite(Number(args[i + 3]))) {
            throw 'Amount has to be finite but got ' + args[i + 3]
        };
    }
    return true
}
export function addPos(pos1, pos2) {
    pos1['BEAM1']['SEPARATION'] += pos2['BEAM1']['SEPARATION'];
    pos1['BEAM1']['CROSSING'] += pos2['BEAM1']['CROSSING'];
    pos1['BEAM2']['SEPARATION'] += pos2['BEAM2']['SEPARATION'];
    pos1['BEAM2']['CROSSING'] += pos2['BEAM2']['CROSSING'];
}
export function checkPosLim(pos, limit) {
    let errArr = []
    if (Math.abs(pos['BEAM1']['SEPARATION']) > limit) errArr.push(`* Beam1, separation, ${pos['BEAM1']['SEPARATION'] * 1e3} mm`);
    if (Math.abs(pos['BEAM1']['CROSSING']) > limit) errArr.push(`* Beam1, crossing, ${pos['BEAM1']['CROSSING'] * 1e3} mm`);
    if (Math.abs(pos['BEAM2']['SEPARATION']) > limit) errArr.push(`* Beam2, separation, ${pos['BEAM2']['SEPARATION'] * 1e3} mm`);
    if (Math.abs(pos['BEAM2']['CROSSING']) > limit) errArr.push(`* Beam2, crossing, ${pos['BEAM2']['CROSSING'] * 1e3} mm`);
    if (errArr.length > 0) {
        errArr.unshift('Beam out of bounds!')
        throw errArr.join('\n');
    }

    return true
}

export class VdMcommandObject {
    constructor(commandLine) {
        const line = commandLine.split(/ +/);

        this.isValid = false;
        this.type = 'command';
        this.index = line[0];
        this.command = line[1];
        this.args = line.slice(2);

        this.realTime = 0;
        this.sequenceTime = 0;
        this.trimTime = 0;
        this.position = {
            BEAM1: {
                SEPARATION: 0,
                CROSSING: 0,
            },
            BEAM2: {
                SEPARATION: 0,
                CROSSING: 0,
            }
        }

        this.commandHandler = {
            'INITIALIZE_TRIM':
                /**
                 * @param {Array} args
                 */
                (args) => {
                    try {
                        if (this.index != 0) {
                            throw 'May only appear at line 0. Encountered at ' + this.index
                        }
                        if (args.length != 4) {
                            throw 'Expected exactly four arguments: IP(...) BEAM(...) PLANE(...) UNITS(...), but got : ' + args.join(' ')
                        }
                        const initArgs = {
                            IP: getInnerBracket(args[0], 'IP'),
                            BEAM: getInnerBracket(args[1], 'BEAM'),
                            PLANE: getInnerBracket(args[2], 'PLANE'),
                            UNITS: getInnerBracket(args[3], 'UNITS'),
                        }
                        if (initArgs.IP.length != 1) {
                            throw 'IP argument can contain at most one valid IP'
                        }
                        testArgs(initArgs);
                    }
                    catch (error) {
                        throw 'Invalid INITIALIZE_TRIM command. ' + error
                    }
                },
            'SECONDS_WAIT':
                /**
                 * @param {Array} args
                 */
                (args) => {
                    if (args.length != 1) {
                        throw `Invalid SECONDS_WAIT command. Expected exactly one argument but got {${args}}`
                    }
                    if (!isFinite(Number(args[0])) || Number(args[0]) < 0) {
                        throw `Invalid SECONDS_WAIT command. Argument must be a finite positive number but got ${args}`
                    }
                },
            'RELATIVE_TRIM':
                /**
                 * @param {Array} args
                 */
                (args) => {
                    // Check syntax
                    try {
                        checkTrimArgs(args)
                    }
                    catch (error) {
                        if (typeof error == 'string') throw 'Invalid RELATIVE_TRIM command. ' + error
                        else throw error
                    }
                },
            'ABSOLUTE_TRIM':
                /**
                 * @param {Array} args
                 */
                (args) => {
                    // Check syntax
                    try {
                        checkTrimArgs(args)
                    }
                    catch (error) {
                        if (typeof error == 'string') throw 'Invalid ABSOLUTE_TRIM command. ' + error
                        else throw error
                    }
                },
            'START_FIT':
                /**
                 * @param {Array} args
                 */
                (args) => {
                    try {
                        if (args.length == 2) {
                            if (!validArguments.PLANE.includes(args[0])) {
                                throw 'Expected plane in ' + validArguments.PLANE + ' but got ' + args[0]
                            }
                            if (!validArguments.FIT_TYPE.includes(args[1])) {
                                throw 'Expected fit type in ' + validArguments.FIT_TYPE + ' but got ' + args[1]
                            }
                        } else {
                            throw 'Expected exactly two arguments "PLANE FIT_TYPE" but got "' + args.join(' ') + '"'
                        }
                    }
                    catch (error) {
                        throw 'Invalid START_FIT command. ' + error
                    }
                },
            'END_FIT':
                /**
                 * @param {Array} args
                 */
                (args) => {
                    if (args.length != 0) {
                        throw 'Invalid END_FIT command. No arguments allowed but got ' + args
                    }
                },
            'END_SEQUENCE':
                (args) => {
                    if (args.length != 0) {
                        throw 'Invalid END_SEQUENCE command. No arguments allowed but got ' + args
                    }
                },
            'MESSAGE':
                (args) => {
                    // Do nothing
                }
        }
    }

    checkSyntax() {
        if (this.commandHandler[this.command]) {
            this.commandHandler[this.command](this.args);
        }
        else {
            throw `Unknown command "${this.command}" encountered`
        }
        this.isValid = true;
        return true
    }
    simulateStep(sigma, trimRate, prevCommand) {
        this.addPos(prevCommand.position)
        this.realTime += prevCommand.realTime;
        this.sequenceTime += prevCommand.sequenceTime;

        if (this.command == 'SECONDS_WAIT') {
            this.sequenceTime += Number(this.args[0]);
            this.realTime += Number(this.args[0]);
        }
        if (this.command.includes('TRIM') && this.isValid) {
            let maxTrimTime = 0;

            for (let i = 0; i < this.args.length; i += 5) {
                let amount = Number(this.args[i + 3]);
                if (this.args[i + 4] == 'SIGMA') amount = amount * sigma; // to meters
                if (this.args[i + 4] == 'MM') amount *= 1e-3; // to meters

                if (this.command == 'ABSOLUTE_TRIM') {
                    amount -= prevCommand.position[this.args[i + 1]][this.args[i + 2]];
                }

                this.position[this.args[i + 1]][this.args[i + 2]] += amount;
                maxTrimTime = Math.max(maxTrimTime, Math.abs(amount) / trimRate)
            }

            this.trimTime = maxTrimTime;
            this.realTime += maxTrimTime;
        }
    }

    separation(plane) {
        return this.position.BEAM2[plane] - this.position.BEAM1[plane]
    }
    stringify() {
        return `${this.index} ${this.command} ${this.args.join(' ')}`.trim()
    }
    addPos(pos) {
        addPos(this.position, pos)
    }
    checkLimit(limit) {
        // Limit in meters
        checkPosLim(this.position, limit);
    }
}








const init_beam_param = { // these are parameters for IP1
    "energy": 6500, // GeV
    "particle_mass": 0.938, // GeV
    "emittance": 3.5e-6, // m
    "beta_star": 20, // m
    "crossing_angle": 300e-6, // rad
    "scan_limits": 6, // sigma
    "trim_rate": 1e-4, // m/s
    "intensity": 1e11, // particles per bunch
    "bunch_pair_collisions": 50,
    "bunch_length": 0.0787 // m
};
export default class VdM {
    constructor(beamParameters, IP) {
        this.param = beamParameters ? toProperUnits(beamParameters, IP) : init_beam_param;
        this.sigma = Math.sqrt((this.param.emittance / (this.param.energy / this.param.particle_mass)) * this.param.beta_star); // m

        this.structure = [];
        this.errors = [];
        this.isValid = false;
    }

    /**
     * @param {string} file
     */
    parse(file, includesHeader = false) {
        this.structure = [];
        this.errors = [];
        let state = {
            fitPlanes: [],
            isFitting: false,
            hasEnded: false,
            currentLineNum: includesHeader ? -1 : 0
        }
        const lineArr = file.split(/\n/).map(x => x.trim());

        for (let [index, line] of lineArr.entries()) {
            let obj;
            try {
                if (!line.match(/^(?:[1-9][0-9]*|0) /)) {
                    // Line type is NOT a command line (not initialised with integer)
                    if (line == '') {
                        obj = {
                            type: 'empty'
                        };
                    } else if (line[0] == '#') {
                        obj = {
                            type: 'comment',
                            comment: line.slice(1).trim()
                        }
                    } else {
                        obj = {
                            type: 'error'
                        };
                        throw new VdMSyntaxError(index, 'Line has to be of the type "#COMMENT", "INT COMMAND", or "EMPTY_LINE"')
                    }
                }
                else {
                    // Line type is a command line. Check line syntax:
                    try {
                        state.currentLineNum++;
                        obj = new VdMcommandObject(line);
                        obj.checkSyntax();

                        if (state.hasEnded) {
                            throw 'Encountered command line "' + line + '" after the END_SEQUENCE command'
                        }
                        if (line.length < 2) {
                            throw 'Valid command is missing. Lines initiated with an integer cannot be empty.'
                        }
                        if (includesHeader && state.currentLineNum == 0 && obj.command != 'INITIALIZE_TRIM') {
                            throw 'Expected first command to be INITIALIZE_TRIM but got ' + line
                        }
                        if (!includesHeader && obj.command == 'INITIALIZE_TRIM') {
                            throw 'Unexpected INITIALIZE_TRIM command encountered'
                        }
                        if (obj.command == 'END_SEQUENCE') {
                            state.hasEnded = true;
                        }
                        if (obj.command == 'START_FIT') {
                            if (state.isFitting) {
                                throw 'Invalid START_FIT command. Previous fit not teminated'
                            }
                            state.fitPlanes = obj.args[0];
                            state.isFitting = true;
                        }
                        if (obj.command == 'END_FIT') {
                            if (!state.isFitting) {
                                throw 'Invalid END_FIT command. Missing START_FIT command'
                            }
                            state.fitPlanes = [];
                            state.isFitting = false;
                        }
                        if (state.isFitting && obj.command.includes('TRIM')) {
                            for (let i = 0; i < obj.args.length; i += 5) {
                                if (!state.fitPlanes.includes(obj.args[i + 2])) {
                                    throw `Invalid TRIM command. Invalid PLANE argument. Expected in {${state.fitPlanes}} but got ${obj.args[i + 2]}`
                                }
                            }
                        }
                    }
                    catch (error) {
                        if (typeof error == 'string') throw new VdMSyntaxError(index, error);
                        else throw error;
                    }

                    // Check line numbering
                    if (parseInt(line.match(/^(?:[1-9][0-9]*|0) /)[0]) != state.currentLineNum) {
                        throw new VdMSyntaxError(index, 'Incorrect line numbering. Expected ' + state.currentLineNum + '... but got ' + line)
                    }
                }
            }
            catch (error) {
                if (error instanceof VdMSyntaxError) this.errors.push(error)
                else throw error;
            }
            finally {
                this.structure.push(obj);
            }
        }

        // Generate initialize trim command line
        let genInitTrimObj
        let genInitTrimLine = this.getInitTrim();
        if (genInitTrimLine) {
            genInitTrimObj = new VdMcommandObject(genInitTrimLine)
            genInitTrimObj.checkSyntax(); // Should be redundant but is an extra safety measure
        } else genInitTrimObj = new VdMcommandObject('0 INITIALIZE_TRIM IP() BEAM() PLANE() UNITS()')

        // Command termination tests
        if (state.isFitting) {
            this.errors.push(new VdMSyntaxError(this.structure.length, 'Missing command END_FIT'))
        }
        if (includesHeader) {
            if (!state.hasEnded) {
                this.errors.push(new VdMSyntaxError(this.structure.length, 'Missing command END_SEQUENCE'))
            }

            let initTrimObj = this.structure.find(x => x.command == 'INITIALIZE_TRIM');
            if (initTrimObj) {
                if (this.errors.length == 0 && initTrimObj.stringify() != genInitTrimObj.stringify()) {
                    this.errors.push(new VdMSyntaxError(0, `Invalid INITIALIZE_TRIM command. Expected "${genInitTrimObj.stringify()}" but got "${initTrimObj.stringify()}"`))
                }
            }
        }
        else {
            // Add initialize trim obj
            this.structure.unshift(genInitTrimObj);
            // Add end sequence obj
            let endTrimIndex = 1 + parseInt(this.structure.slice().reverse().find(x => x.type == 'command').index);
            let endSeqObj = new VdMcommandObject(endTrimIndex + ' END_SEQUENCE');
            endSeqObj.checkSyntax(); // Should be redundant but is an extra safety measure
            this.structure.push(endSeqObj);
        }

        // simulation of beam position and luminosity
        this.simulateBeam()
        this.checkBeamPositionLimits()

        this.isValid = this.errors.length == 0 ? true : false;
        return this
    }
    deparse() {
        let string = '';
        for (let [i, obj] of this.structure.entries()) {
            let line = '';
            if (obj.type == 'command') {
                line += obj.stringify();
            } else if (obj.type == 'empty') {
                // Line stays empty
            } else if (obj.type == 'comment') {
                line += '# ' + obj.comment;
            } else {
                throw new Error('Expected object of type command, empty, or comment but got ' + obj.type)
            }
            line += '\n';
            string += line;
        }
        return string.trim() + '\n';
    }

    simulateBeam() {
        for (let [i, command] of this.structure.entries()) {
            if (command.type == 'command') {
                // Simulate beam movement
                const prevCommand = this.structure.find(x => x.index == command.index - 1)
                if (prevCommand) {
                    command.simulateStep(this.sigma, this.param.trim_rate, prevCommand);
                }

                // Simulate luminosity
                command.luminosity = this.luminosityFromPos(command.position); // Hz/m^2
            }
        }
    }
    checkBeamPositionLimits() {
        for (let [i, command] of this.structure.entries()) {
            if (command.type == 'command') {
                try {
                    command.checkLimit(this.param.scan_limits * this.sigma);
                } catch (error) {
                    if (typeof error == 'string') this.errors.push(new VdMSyntaxError(i - 1, error))
                    else throw error
                }
            }
        }
    }
    getInitTrim() {
        let argArr = {
            IP: new Set([]),
            BEAM: new Set([]),
            PLANE: new Set([]),
            UNITS: new Set([])
        };
        let errArr = [];

        for (let [index, obj] of this.structure.entries()) {
            if (obj.type == 'command' && obj.command.match(/^(R|A).*(?:TRIM)$/) && obj.isValid) {
                for (let i = 0; i < obj.args.length; i += 5) {
                    if (argArr.IP.has(obj.args[i + 0])) {
                        // do nothing
                    }
                    else if (argArr.IP.size > 0) {
                        errArr.push(new VdMSyntaxError(index, `File can have at most one IP. Expected ${Array.from(argArr.IP)[0]} but got ${obj.args[i + 0]}`))
                    }
                    else argArr.IP.add(obj.args[i + 0]);

                    argArr.BEAM.add(obj.args[i + 1]);
                    argArr.PLANE.add(obj.args[i + 2]);
                    argArr.UNITS.add(obj.args[i + 4]);
                }
            }
        }
        for (let [type, set] of Object.entries(argArr)) {
            if (set.size < 1) {
                errArr.push(new VdMSyntaxError(0, 'Missing ' + type + ' argument to generate INITIALIZE_TRIM command'))
            }
            if (!isSubsetOf(set, validArguments[type])) {
                errArr.push(new VdMSyntaxError(0, `Expected subset of {${validArguments[type]}} but got {${Array.from(set)}}`))
            }
        }
        if (errArr.length == 0) return '0 INITIALIZE_TRIM ' + Object.entries(argArr).map(x => x[0] + '(' + Array.from(x[1]).join(',').trim() + ')').join(' ');
        else this.errors = this.errors.concat(errArr);
    }

    luminosity(separation, crossing) {
        return calcLuminosity(separation, crossing, this.sigma, this.param.bunch_length, this.param.crossing_angle, this.param.intensity, this.param.bunch_pair_collisions)
    }
    luminosityFromPos(pos) {
        let sep = (pos['BEAM1']['SEPARATION'] - pos['BEAM2']['SEPARATION']); // in m
        let cross = (pos['BEAM1']['CROSSING'] - pos['BEAM2']['CROSSING']); // in m
        return this.luminosity(sep, cross); // Hz/m^2
    }

    toBeamGraph(beamNumber, sepVScross) {
        return this.structure.map(line => {
            if (line.type == "command")
                return [{
                    realTime: line.realTime,
                    sequenceTime: line.sequenceTime
                }, {
                    mm: line.position["BEAM" + beamNumber][sepVScross] * 1e3, // to mm
                    sigma: line.position["BEAM" + beamNumber][sepVScross] / this.sigma // to sima
                }]
        }).filter(x => x);
    }

    //toLumiGraph(resolution = 0.1) {
    toLumiGraph(stepsPerTrim = 10) {
        let result = [];
        const commands = this.structure.filter(x => x.type == 'command' && x.isValid);
        commands.forEach((command, index, commands) => {
            const prevCommand = commands[index - 1]

            if (command.command.includes('TRIM') && prevCommand) {
                //const num = Math.round(command.trimTime / resolution);
                const num = stepsPerTrim;

                const startTime = command.realTime - command.trimTime;
                const timeArr = linspace(startTime, command.realTime, num)
                const sepArr = linspace(prevCommand.separation('SEPARATION'), command.separation('SEPARATION'), num)
                const crossArr = linspace(prevCommand.separation('CROSSING'), command.separation('CROSSING'), num)

                const trimPoints = Array(num);
                for (let i = 0; i < num; i++) {
                    trimPoints[i] = [
                        {
                            realTime: timeArr[i],
                            sequenceTime: command.sequenceTime
                        },
                        this.luminosity(sepArr[i], crossArr[i])
                    ]
                }
                result = result.concat(trimPoints)
            }
            else {
                result.push(toGraphPoint(command))
            }
        })

        return result;
    }

    checkSyntax() {
        if (this.isValid) return true
        else throw this.errors
    }
}