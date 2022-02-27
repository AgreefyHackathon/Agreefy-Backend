"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.agreefy = void 0;
const functions = __importStar(require("firebase-functions"));
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const busboy_1 = __importDefault(require("busboy"));
const request_1 = __importDefault(require("request"));
const { create } = require('ipfs-http-client');
const app = express_1.default();
// express session
app.set('trust proxy', 1); // trust first proxy
app.use(cors_1.default());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
const ipfs = create({
    url: 'https://ipfs.infura.io:5001/api/v0'
});
/**
 * Function to serve the index.html to manage the contracts
 */
app.get('/home/', function (req, res) {
    res.sendFile('home.html', { root: path_1.default.resolve('.', 'public') });
});
app.post('/new/', async (req, res, next) => {
    try {
        const data = await extractMultipartFormData(req);
        const firstParty_id = data.fields.firstParty_id;
        const secondParty_id = data.fields.secondParty_id;
        const contract_file = data.uploads.contract;
        if (!firstParty_id)
            throw Error("Error: First Party ID is required!");
        if (!secondParty_id)
            throw Error("Error: Second Party ID is required!");
        if (!contract_file)
            throw Error("Error: The file is missing!");
        const apiRes = await ipfs.add(contract_file);
        res.send(apiRes);
    }
    catch (err) {
        res.send({
            error: true,
            message: err['message']
        });
    }
});
/**
 * Proxying the file data
 */
app.get('/view/:ID', async (req, res) => {
    const url = `https://ipfs.io/ipfs/${req.params.ID}`;
    request_1.default.get(url).pipe(res);
});
/**
 * Custom parser to parse the form data uploads and fields
 * credits: https://stackoverflow.com/a/63379675/10456639
 */
function extractMultipartFormData(req) {
    return new Promise((resolve, reject) => {
        if (req.method != 'POST') {
            return reject(405);
        }
        else {
            const busboy = new busboy_1.default({ headers: req.headers });
            const tmpdir = os_1.default.tmpdir();
            const fields = {};
            const fileWrites = [];
            const uploads = {};
            busboy.on('field', (fieldname, val) => (fields[fieldname] = val));
            busboy.on('file', (fieldname, file, filename) => {
                const filepath = path_1.default.join(tmpdir, filename);
                const writeStream = fs_1.default.createWriteStream(filepath);
                uploads[fieldname] = filepath;
                file.pipe(writeStream);
                const promise = new Promise((resolve, reject) => {
                    file.on('end', () => {
                        writeStream.end();
                    });
                    writeStream.on('finish', resolve);
                    writeStream.on('error', reject);
                });
                fileWrites.push(promise);
            });
            busboy.on('finish', async () => {
                const result = { fields, uploads: {} };
                await Promise.all(fileWrites);
                for (const file in uploads) {
                    const filename = uploads[file];
                    result.uploads[file] = fs_1.default.readFileSync(filename);
                    fs_1.default.unlinkSync(filename);
                }
                resolve(result);
            });
            busboy.on('error', reject);
            if (req.rawBody) {
                busboy.end(req.rawBody);
            }
            else {
                req.pipe(busboy);
            }
        }
    });
}
;
exports.agreefy = functions.https.onRequest(app);
//# sourceMappingURL=index.js.map