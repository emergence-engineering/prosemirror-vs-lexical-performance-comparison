import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
} from "lexical";
import { $setBlocksType } from "@lexical/selection";
import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { $createLinkNode } from "@lexical/link";
import { useCallback, useState } from "react";
import { INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/react/LexicalHorizontalRuleNode";
import { $createCodeNode } from "@lexical/code";
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from "@lexical/list";

export const FormatText = () => {
  const [editor] = useLexicalComposerContext();
  const formattingTextOptions = ["B", "I"];

  const formattingTextOnClick = (tag: string): void => {
    switch (tag) {
      case "B":
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
        break;
      case "I":
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
        break;
      default:
        console.log("error formatting");
        break;
    }
  };

  return (
    <>
      {formattingTextOptions.map((tag, i) => (
        <button
          className={"toolbar__item"}
          key={i}
          onClick={() => formattingTextOnClick(tag)}
          // $isTypeOpen={isTypeOpen}
        >
          {tag}
        </button>
      ))}
    </>
  );
};

export const Monocode = (): JSX.Element => {
  const [editor] = useLexicalComposerContext();

  const codeOnClick = (): void => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code");
  };
  return (
    <button className={"toolbar__item"} onClick={codeOnClick}>
      mono
    </button>
  );
};

export const InsertLink = (): JSX.Element => {
  const [editor] = useLexicalComposerContext();
  const [isLink, setIsLink] = useState(false);
  const [link, setLink] = useState("");
  const [isSeen, setIsSeen] = useState(false);
  const linkRegex =
    /[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/;

  const linkOnClick = useCallback(() => {
    setIsLink(!isLink);
    setIsSeen(true);
  }, [editor, isLink]);

  const handleLinkEnter = useCallback(
    (link: string) => {
      if (link === "") {
        alert("link is empty");
        setIsSeen(false);
        return;
      }
      if (!linkRegex.test(link)) {
        alert("invalid link");
        setIsSeen(false);
        return;
      }
      setIsSeen(false);
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const linkNode = $createLinkNode(link);
          selection.removeText();
          selection.insertNodes([linkNode]);
          editor.focus();
        }
      });
    },
    [editor, isLink, linkRegex],
  );

  return (
    <>
      <button className={"toolbar__item"} onClick={linkOnClick}>
        link
      </button>

      {isSeen && (
        <div>
          <input
            type="text"
            placeholder="http://"
            value={link}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setLink(e.target.value);
            }}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleLinkEnter(link);
              }
            }}
          />
        </div>
      )}
    </>
  );
};

export const HR = () => {
  const [editor] = useLexicalComposerContext();

  const hrOnClick = (): void => {
    editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined);
  };
  return (
    <button className={"toolbar__item"} onClick={hrOnClick}>
      HR
    </button>
  );
};

export const UnDoReDo = () => {
  const [editor] = useLexicalComposerContext();

  const undoRedo = (e: React.MouseEvent) => {
    const target = e.currentTarget;
    const id = target.id;

    if (id === "undo") {
      editor.dispatchCommand(UNDO_COMMAND, undefined);
    } else {
      editor.dispatchCommand(REDO_COMMAND, undefined);
    }
  };

  return (
    <>
      <button
        className={"toolbar__item"}
        id={"undo"}
        onClick={(e) => undoRedo(e)}
      >
        {"<<"}
      </button>
      <button
        className={"toolbar__item"}
        id={"redo"}
        onClick={(e) => undoRedo(e)}
      >
        {">>"}
      </button>
    </>
  );
};

type HeadingTags = "h1" | "h2" | "h3" | "h4" | "h5";
export const Heading = (): JSX.Element => {
  const [editor] = useLexicalComposerContext();
  const headingTags: HeadingTags[] = ["h1", "h2", "h3", "h4", "h5"];

  const headingOnClick = (tag: HeadingTags): void => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode(tag));
      }
    });
  };

  return (
    <>
      {headingTags.map((tag, i) => (
        <button
          className={"toolbar__item"}
          key={i}
          onClick={() => headingOnClick(tag)}
        >
          {tag}
        </button>
      ))}
    </>
  );
};

export const CodeBlock = () => {
  const [editor] = useLexicalComposerContext();

  const codeBlockOnClick = () => {
    editor.update(() => {
      let selection = $getSelection();

      if ($isRangeSelection(selection)) {
        if (selection.isCollapsed()) {
          $setBlocksType(selection, () => $createCodeNode());
        } else {
          const textContent = selection.getTextContent();
          const codeNode = $createCodeNode();

          selection.insertNodes([codeNode]);
          selection = $getSelection();
          if ($isRangeSelection(selection))
            selection.insertRawText(textContent);
        }
      }
    });
  };

  return (
    <button className={"toolbar__item"} onClick={codeBlockOnClick}>
      CodeBlock
    </button>
  );
};

export const NormalParagraph = () => {
  const [editor] = useLexicalComposerContext();

  const normalPOnClick = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createParagraphNode());
      }
    });
  };

  return (
    <button className={"toolbar__item"} onClick={normalPOnClick}>
      Normal P
    </button>
  );
};

type ListTags = "ul" | "ol" | "checklist";
export const Listing = () => {
  const [editor] = useLexicalComposerContext();
  const listingTags: ListTags[] = ["ul", "ol"];

  const listingOnClick = (tag: ListTags): void => {
    if (tag === "ol") {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
      return;
    }
    editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
  };
  return (
    <>
      {listingTags.map((tag, i) => (
        <button
          className={"toolbar__item"}
          key={i}
          onClick={() => listingOnClick(tag)}
        >
          {tag}
        </button>
      ))}
    </>
  );
};

export const Blockquote = () => {
  const [editor] = useLexicalComposerContext();

  const blockquoteOnClick = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createQuoteNode());
      }
    });
  };

  return (
    <button className={"toolbar__item"} onClick={blockquoteOnClick}>
      quote
    </button>
  );
};
