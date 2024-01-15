import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema, DOMParser } from "prosemirror-model";
import { schema } from "prosemirror-schema-basic";
import { addListNodes } from "prosemirror-schema-list";
import { exampleSetup } from "prosemirror-example-setup";
import { useEffect } from "react";

const mySchema = new Schema({
  nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block"),
  marks: schema.spec.marks,
});

const PMEditor = () => {
  useEffect(() => {
    const view = new EditorView(
      document.querySelector("#editor") as HTMLElement,
      {
        attributes: {
          spellcheck: "false",
        },
        state: EditorState.create({
          doc: DOMParser.fromSchema(mySchema).parse(
            document.createElement("div"),
          ),
          plugins: exampleSetup({ schema: mySchema }),
        }),
      },
    );
    return () => {
      view.destroy();
    };
  }, []);

  return (
    <div className={"editorwrapper"}>
      <div id={"editor"}></div>
    </div>
  );
};

export default PMEditor;
