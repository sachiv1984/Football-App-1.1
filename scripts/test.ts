import * as cheerio from 'cheerio';

const html = '<h1>Hello, World!</h1>';
const $ = cheerio.load(html);

console.log($.text());
