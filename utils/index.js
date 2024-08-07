const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
const { exec } = require("child_process");

async function writeReviewToFile(reviewContent) {
  const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath; // Get the workspace folder path
  const fileName = `review_${new Date().toISOString().split("T")[0]}.md`; // Create a filename based on the current date
  const filePath = path.join(workspaceFolder, fileName); // Create the full file path

  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, reviewContent, (err) => {
      if (err) {
        return reject(`Error writing to file: ${err.message}`);
      }
      resolve(filePath); // Return the path of the created file
    });
  });
}

async function processDiff(diff) {
  const addedLines = diff
    .split("\n")
    .filter((line) => line.startsWith("+") && !line.startsWith("+++")).length;
  const removedLines = diff
    .split("\n")
    .filter((line) => line.startsWith("-") && !line.startsWith("---")).length;

  return `Changes detected:\n- Lines added: ${addedLines}\n- Lines removed: ${removedLines}`;
}

async function getGitDiff() {
  return new Promise((resolve, reject) => {
    // Execute 'git diff' to get unstaged changes
    exec(
      "git diff",
      { cwd: vscode.workspace.workspaceFolders[0].uri.fsPath },
      (error, stdout, stderr) => {
        if (error) {
          // If there is an error, check if it's because there are no changes
          if (stderr.includes("nothing to commit")) {
            return resolve(""); // Resolve with an empty string if there are no changes
          }
          return reject(`Error getting git diff: ${stderr}`);
        }
        console.log("stdout")
        console.log(stdout)
        resolve(stdout); // Resolve with the output of the command
      }
    );
  });
}

module.exports = {
  writeReviewToFile,
  getGitDiff,
  processDiff,
};
