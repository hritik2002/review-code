// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const axios = require("axios");

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */

async function formatCode(text, editor, selection, selectedTextDecorationType) {
  editor.setDecorations(selectedTextDecorationType, [
    {
      range: selection,
      hoverMessage: {
        language: "html",
        value: "Reviewing your code. Please wait...",
      },
    },
  ]);
  const payload = {
    prompt: `Please format the following code with better naming convention and best practices with brief comments if necessary, show full code and nothing else with 2 short improvement tips on the code:\n${text}`,
    temperature: 0.5,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    max_tokens: 1024,
    stream: false,
    n: 1,
    model: "text-davinci-003",
  };
  return await axios({
    method: "POST",
    url: "https://api.openai.com/v1/completions",
    data: payload,
    headers: {
      "Content-Type": "application/json",
      Authorization:
        "Bearer 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",
    },
  })
    .then((response) => {
      const formattedCode = response.data.choices[0].text.trim();
      console.log(response.data.choices);

      return formattedCode;
    })
    .catch((e) => {
      console.log(e.message, e);

      return "Not found!";
    });
}

function activate(context) {
  const selectedTextDecorationType =
    vscode.window.createTextEditorDecorationType({
      backgroundColor: "transparent",
    });

  let disposable = vscode.commands.registerCommand(
    "review-code.helloWorld",

    async function () {
      const editor = vscode.window.activeTextEditor;
      const selection = editor.selection;
      const text = editor.document.getText(selection);

      // call open ai and get the correct format of that code with better readability
      // const formattedCode = await formatCode(text);

      const message = await formatCode(
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
            value: "Reviewed code: \n" + message,
          },
        },
      ]);
    }
  );

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
