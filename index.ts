import * as fs from "fs";
import * as cheerio from "cheerio";

type Entries = (Bookmark | Folder)[];
interface Bookmark {
  type: "bookmark";
  title: string;
  url: string;
  addDate: string | null;
  lastModified: string | null;
  icon: string | null;
}
interface Folder {
  type: "folder";
  title: string;
  addDate: string | null;
  lastModified: string | null;
  contents: (Bookmark | Folder)[];
}

function isBookmark(node: cheerio.Cheerio, item: Bookmark | Folder): item is Bookmark {
  return node.is("A") || item.type === "bookmark";
}
function isFolder(node: cheerio.Cheerio, item: Bookmark | Folder): item is Folder {
  return node.is("H3") || node.children("A").length > 0 || item.type === "folder";
}

function parseNode($: cheerio.Root, element: cheerio.Cheerio): Entries {
  let result: (Bookmark | Folder)[] = [];

  element.children("DT").each((_, elem) => {
    const node = $(elem);
    const item = {} as Bookmark | Folder;
    const titleElement = node.find("> A, > H3").first();

    if (isBookmark(titleElement, item)) {
      item.type = "bookmark";
      item.title = titleElement.text();
      item.url = titleElement.attr("href") || "";
      item.addDate = titleElement.attr("add_date") || null;
      item.lastModified = titleElement.attr("last_modified") || null;
      item.icon = titleElement.attr("icon") || null;
    } else if (isFolder(titleElement, item)) {
      item.type = "folder";
      item.title = titleElement.text();
      item.addDate = titleElement.attr("add_date") || null;
      item.lastModified = titleElement.attr("last_modified") || null;
    }

    const nextDl = node.children("DL");
    if (isFolder(titleElement, item)) {
      item.contents = parseNode($, nextDl);
    }

    if (Object.keys(item).length !== 0) {
      result.push(item);
    }
  });

  return result;
}

function removeFolderFromJSON(nodes: Entries, dirsToRemove: string[]): Entries {
  const cp = structuredClone(nodes);
  return cp.filter((node) => {
    if (node.type === "folder") {
      if (dirsToRemove.includes(node.title)) {
        return false;
      } else {
        node.contents = removeFolderFromJSON(node.contents, dirsToRemove);
        return node.contents.length > 0;
      }
    }
    return true;
  });
}

function pickUpFolderFromJSON(nodes: Entries, dirsToPickUp: string[]): Entries {
  const cp = structuredClone(nodes);
  return cp.filter((node) => {
    if (node.type === "folder") {
      if (dirsToPickUp.includes(node.title)) {
        return true;
      } else {
        node.contents = pickUpFolderFromJSON(node.contents, dirsToPickUp);
        return node.contents.length > 0;
      }
    }
    return false;
  });
}

function convertBookmarksToJSON(inputPath: string): Entries {
  const rawBookmarks = fs.readFileSync(inputPath, "utf8");

  const $ = cheerio.load(rawBookmarks);
  const rootDl = $("DL").first();

  const bookmarksJSON = parseNode($, rootDl);

  return bookmarksJSON;
}

function writeJson(bookmarksJSON: Entries, outputPath: string): void {
  fs.writeFile(outputPath, JSON.stringify(bookmarksJSON, null, 2), (err) => {
    if (err) {
      console.error("Error writing file:", err);
    } else {
      console.log(`Bookmarks converted to JSON successfully!: ${outputPath}`);
    }
  });
}

function grepUrls(bookmarksJSON: Entries): Set<string> {
  const result = new Set<string>();
  bookmarksJSON.forEach((node) => {
    if (node.type === "bookmark") {
      result.add(node.url);
    } else if (node.type === "folder") {
      const urls = grepUrls(node.contents);
      urls.forEach((url) => result.add(url));
    }
  });
  return result;
}

try {
  const inputFile: string = "./imports/bookmarks_2024_07_28.html"; // HTML file to be converted
  const outputFile: string = "./exports/bookmarks_2024_07_28.json"; // JSON file to be created

  const bookmarkJson = convertBookmarksToJSON(inputFile);

  const editedBookmark = removeFolderFromJSON(bookmarkJson, ["accounts"]);
  writeJson(editedBookmark, outputFile);

  const urlList = grepUrls(editedBookmark);
  fs.writeFileSync("./exports/urls.txt", Array.from(urlList).join("\n"));

  console.log("Bookmark JSON has been successfully created.");
} catch (error) {
  console.error("Error processing the file:", error);
}
