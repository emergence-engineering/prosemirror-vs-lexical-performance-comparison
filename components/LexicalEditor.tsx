import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin";
import { LineBreakNode, ParagraphNode } from "lexical";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import ToolbarPlugin from "./ToolbarPlugin";
import {
  AutoLinkPlugin,
  createLinkMatcherWithRegExp,
} from "@lexical/react/LexicalAutoLinkPlugin";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListItemNode, ListNode } from "@lexical/list";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import styled from "styled-components";
import { Wrapper } from "./PMEditor";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import LexicalClickableLinkPlugin from "@lexical/react/LexicalClickableLinkPlugin";

const EditorWrapper = styled(Wrapper)`
  flex-direction: column;
  align-items: center;
  align-self: center;
  width: 80%;
`;

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
const LexicalEditor = () => {
  const URL_REGEX =
    /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/;

  const MATCHERS = [
    createLinkMatcherWithRegExp(URL_REGEX, (text) => {
      return text.startsWith("http") ? text : `https://${text}`;
    }),
  ];

  const urlRegExp = new RegExp(
    /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=+$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=+$,\w]+@)[A-Za-z0-9.-]+)((?:\/[+~%/.\w-_]*)?\??(?:[-+=&;%@.\w_]*)#?(?:[\w]*))?)/,
  );
  function validateUrl(url: string): boolean {
    return url === "https://" || urlRegExp.test(url);
  }

  return (
    <EditorWrapper>
      <LexicalComposer initialConfig={initialConfig}>
        <ToolbarPlugin />
        <MarkdownShortcutPlugin />
        <AutoLinkPlugin matchers={MATCHERS} />
        <HorizontalRulePlugin />
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin validateUrl={validateUrl} />

        <RichTextPlugin
          contentEditable={
            <ContentEditable className={"ContentEditable__root"} />
          }
          placeholder={<div className={"placeholder"}>Enter some text...</div>}
          ErrorBoundary={LexicalErrorBoundary}
        />
      </LexicalComposer>
    </EditorWrapper>
  );
};

export default LexicalEditor;
