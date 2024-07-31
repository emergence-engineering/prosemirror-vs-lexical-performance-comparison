import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin";
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  LineBreakNode,
  ParagraphNode,
} from "lexical";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import ToolbarPlugin from "./ToolbarPlugin";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListItemNode, ListNode } from "@lexical/list";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $generateHtmlFromNodes } from "@lexical/html";

const myTheme = {
  text: {
    code: "textCode",
  },
  quote: "quote",
  link: "mylink",
  code: "codeblock",
};

function onError(error: Error) {
  console.error(error);
}

const initialConfig = {
  namespace: "MyEditor",
  theme: myTheme,
  onError,
  nodes: [
    HeadingNode,
    LinkNode,
    HorizontalRuleNode,
    CodeNode,
    QuoteNode,
    CodeHighlightNode,
    ParagraphNode,
    AutoLinkNode,
    LineBreakNode,
    ListNode,
    ListItemNode,
  ],
};

const LogEditorHTMLButton = () => {
  const [editor] = useLexicalComposerContext();

  const logInnerHTML = () => {
    editor.update(() => {
      const htmlString = $generateHtmlFromNodes(editor);
      console.log(htmlString);
    });
  };

  return (
    <button onClick={logInnerHTML} className={"logB"}>
      Log HTML
    </button>
  );
};

const SimulateEnter = () => {
  const [editor] = useLexicalComposerContext();

  const simulateEnterKey = () => {
    editor.update(() => {
      const selection = $getSelection();
      if (selection) {
        const paragraphNode = $createParagraphNode();
        selection.insertNodes([paragraphNode]);
        const root = $getRoot();
        root.append(paragraphNode);
        paragraphNode.select();
      }
    });
  };

  return (
    <button onClick={simulateEnterKey} className={"enterB"}>
      Enter
    </button>
  );
};

const LexicalEditor = () => {
  return (
    <div className={"editorwrapper--Lexical"}>
      <LexicalComposer initialConfig={initialConfig}>
        <ToolbarPlugin />
        <MarkdownShortcutPlugin />
        <HorizontalRulePlugin />
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />

        <RichTextPlugin
          contentEditable={
            <ContentEditable className={"ContentEditable__root"} />
          }
          placeholder={<div className={"placeholder"}>Enter some text...</div>}
          ErrorBoundary={LexicalErrorBoundary}
        />

        <LogEditorHTMLButton />
        <SimulateEnter />
      </LexicalComposer>
    </div>
  );
};

export default LexicalEditor;
