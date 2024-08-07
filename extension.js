// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { getGitDiff, writeReviewToFile, processDiff } = require("./utils");

function getApiKey() {
  const config = vscode.workspace.getConfiguration("gemini");
  return config.get("apiKey");
}

let GEMINI_API_KEY = getApiKey(),
  genAI,
  model;

const initGenAiModel = () => {
  if (!GEMINI_API_KEY) {
    GEMINI_API_KEY = getApiKey();
  }

  genAI = new GoogleGenerativeAI(GEMINI_API_KEY ?? "");
  model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
};

initGenAiModel();

/**
 * @param {vscode.ExtensionContext} context
 */

async function formatCode({
  text,
  editor,
  selection,
  selectedTextDecorationType,
  isReviewCode,
}) {
  if (!GEMINI_API_KEY) {
    initGenAiModel();
  }

  if (!GEMINI_API_KEY) {
    vscode.window.showErrorMessage("No API key provided. Cannot format code.");
    return;
  }

  if (editor)
    editor.setDecorations(selectedTextDecorationType, [
      {
        range: selection,
        hoverMessage: {
          language: "html",
          value: "Reviewing your code. Please wait...",
        },
      },
    ]);

  let prompt = `Please format the following code with better naming convention and best practices with brief comments if necessary, show full code and nothing else with 2 short improvement tips on the code:\n${text}`;

  if (isReviewCode) {
    prompt = `Human: You are a senior developer tasked with reviewing the provided code patch. Your review should identify and categorize issues, highlighting potential bugs, suggesting performance optimizations, and flag security issues. Please be aware there maybe libraries or technologies present which you do not know. Format the review output as valid JSON. Each identified issue should be an object in an array, with each object including the following fields: 'category', 'description', 'suggestedCode', and 'codeSnippet'. The category should be one of 'Bugs', 'Performance', 'Security' or 'Style'. The suggestedCode should be an empty string if the recommendation is general or you do not have any code to fix the problem, otherwise return the suggested code to fix the problem. Make sure to escape any special characters in the suggestedCode and in the problematic codeSnippet. Output format: [{"category": "Bugs", "description": "<Describe the problem with the code>", "suggestedCode": "<Insert a code suggestion in the same language as the patch which fixes the issue>", "codeSnippet": "<Insert the problematic code from the patch>"}]. Return the array nothing else.

    ${text}

    Take a deep breath.

    Assistant:
    `;
  }
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const responseText = response.text();
  return responseText;
}

function activate(context) {
  const selectedTextDecorationType =
    vscode.window.createTextEditorDecorationType({
      backgroundColor: "transparent",
    });

  const setGeminiApiKey = vscode.commands.registerCommand(
    "extension.setGeminiApiKey",
    async () => {
      const apiKey = await vscode.window.showInputBox({
        placeHolder: "Enter your Gemini API key",
        prompt: "Please enter your Gemini API key to enable AI services.",
      });

      if (apiKey) {
        const config = vscode.workspace.getConfiguration("gemini");
        await config.update(
          "apiKey",
          apiKey,
          vscode.ConfigurationTarget.Global
        );
        vscode.window.showInformationMessage(
          "Gemini API key saved successfully!"
        );
      }
    }
  );
  const reviewGitDiffCommand = vscode.commands.registerCommand(
    "review-code.reviewGitDiff",
    async () => {
      try {
        const diff = await getGitDiff();
        if (!diff) {
          vscode.window.showInformationMessage("No changes to review.");
          return;
        }

        // Process the diff and format it for review
        const reviewMessage = await formatCode({
          text: diff,
          isReviewCode: true,
        });

        // Display the review message
        vscode.window.showInformationMessage(
          `Review of changes:\n${reviewMessage}`
        );

        await writeReviewToFile(`Review of changes:\n${reviewMessage}`);
      } catch (error) {
        vscode.window.showErrorMessage(`Error reviewing git diff: ${error}`);
      }
    }
  );

  let reviewCodeCommand = vscode.commands.registerCommand(
    "review-code.helloWorld",

    async function () {
      const editor = vscode.window.activeTextEditor;
      const selection = editor.selection;
      const text = editor.document.getText(selection);

      if (text.trim().length === 0) {
        return;
      }

      const formattedCode = await formatCode({
        text,
        editor,
        selection,
        selectedTextDecorationType,
      });

      editor.setDecorations(selectedTextDecorationType, [
        {
          range: selection,
          hoverMessage: {
            language: "html",
            value: formattedCode,
          },
        },
      ]);
    }
  );

  context.subscriptions.push(reviewGitDiffCommand);
  context.subscriptions.push(reviewCodeCommand);
  context.subscriptions.push(setGeminiApiKey);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
