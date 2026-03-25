"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
let movies = [];
fs_1.default.createReadStream(path_1.default.join(__dirname, '..', 'src', 'movies.csv'))
    .pipe((0, csv_parser_1.default)())
    .on('data', (data) => movies.push(data))
    .on('end', () => console.log('CSV file successfully loaded'));
app.get('/movies', (_req, res) => {
    res.json(movies);
});
app.get('/movies/:id', (req, res) => {
    const movie = movies.find((m) => m['Movie ID'] === req.params.id);
    if (movie) {
        res.json(movie);
    }
    else {
        res.status(404).send('Movie not found');
    }
});
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
