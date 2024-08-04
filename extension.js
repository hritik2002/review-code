// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");

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

async function formatCode(text, editor, selection, selectedTextDecorationType) {
  if (!GEMINI_API_KEY) {
    initGenAiModel();
  }

  if (!GEMINI_API_KEY) {
    vscode.window.showErrorMessage("No API key provided. Cannot format code.");
    return;
  }

  editor.setDecorations(selectedTextDecorationType, [
    {
      range: selection,
      hoverMessage: {
        language: "html",
        value: "Reviewing your code. Please wait...",
      },
    },
  ]);

  const prompt = `Please format the following code with better naming convention and best practices with brief comments if necessary, show full code and nothing else with 2 short improvement tips on the code:\n${text}`;
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

  let disposable = vscode.commands.registerCommand(
    "review-code.helloWorld",

    async function () {
      const editor = vscode.window.activeTextEditor;
      const selection = editor.selection;
      const text = editor.document.getText(selection);

      if (text.trim().length === 0) {
        return;
      }

      const formattedCode = await formatCode(
        text,
        editor,
        selection,
        selectedTextDecorationType
      );

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

  context.subscriptions.push(disposable);
  context.subscriptions.push(setGeminiApiKey);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
