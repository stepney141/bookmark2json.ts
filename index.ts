import * as fs from 'fs';
import * as cheerio from 'cheerio';

const inputFile: string = "imports/bookmarks_2024_05_31.html"; // 入力HTMLファイルのパス
const outputFile: string = "exports/bookmarks_2024_05_31.json"; // 出力JSONファイルのパス

// Function to read the bookmark file and convert it to JSON
function convertBookmarksToJSON(inputPath: string, outputPath: string): void {
    fs.readFile(inputPath, 'utf8', (err, data) => {
        if (err) {
            console.error("Error reading file:", err);
            return;
        }

        const $ = cheerio.load(data);

        function processNode(element: cheerio.Cheerio): any {
            let result: any[] = [];

            element.children('DT').each((_, elem) => {
                const node = $(elem);
                const item: any = {};
                const titleElement = node.find('> A, > H3').first();
                
                if (titleElement.is('A')) {
                    item.title = titleElement.text();
                    item.url = titleElement.attr('href');
                    item.addDate = titleElement.attr('add_date') || null;
                    item.lastModified = titleElement.attr('last_modified') || null;
                    item.icon = titleElement.attr('icon') || null;
                } else if (titleElement.is('H3')) {
                    item.title = titleElement.text();
                    item.addDate = titleElement.attr('add_date') || null;
                    item.lastModified = titleElement.attr('last_modified') || null;
                }

                const nextDl = node.children('DL');
                if (nextDl.length) {
                    item.children = processNode(nextDl);
                }

                if (Object.keys(item).length !== 0) {
                    result.push(item);
                }
            });

            return result;
        }

        const rootDl = $('DL').first();
        const bookmarksJSON = processNode(rootDl);

        fs.writeFile(outputPath, JSON.stringify(bookmarksJSON, null, 2), err => {
            if (err) {
                console.error("Error writing file:", err);
            } else {
                console.log("Bookmarks converted to JSON successfully!");
            }
        });
    });
}


// Replace 'path_to_your_bookmark_file.html' with the path to your bookmark file
convertBookmarksToJSON(inputFile, outputFile);

console.log('Bookmark JSON has been created.');
