import styled from "styled-components";
import {
  Blockquote,
  CodeBlock,
  FormatText,
  Heading,
  HR,
  InsertLink,
  Listing,
  Monocode,
  NormalParagraph,
  UnDoReDo,
} from "./ToolbarItems";
import React, { useRef, useState } from "react";

const Toolbar = styled.div`
  display: flex;
  width: 100%;
  gap: 5px;
  align-items: center;
  padding: 3px 6px;
  border: 1px solid #c7c7c7;

  border-radius: 10px 10px 0 0;
  margin: 10px 0;
`;

export const ToolbarItem = styled.button`
  display: inline-block;
  line-height: 0.8;
  cursor: pointer;
  padding: 3px 6px;
  border: none;
  background: none;
  color: black;
  align-items: baseline;

  min-width: 30px;
  font-size: 14px;

  :hover {
    background: #d1e3ff;
    border-radius: 5px;
  }
`;

const Dropdown = styled.div<{ isTypeOpen: boolean }>`
  display: ${({ isTypeOpen }) => (isTypeOpen ? "flex" : "none")};
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 3px 6px;
  border-radius: 10px;
  border: 2px solid #c7c7c7;
  background-color: #f8f8f8;

  z-index: 10;
  width: 100px;
  justify-content: center;
  text-align: center;

  position: absolute;
  top: 120px;
  left:  360px;
      
  };
`;

// bold italic mono link, insert img and hr, type plain and code and heading, undo, redo, ul, ol, quote

const ToolbarPlugin = () => {
  const typeRef = useRef<HTMLDivElement>(null);
  const [isTypeOpen, setIsTypeOpen] = useState(false);

  return (
    <Toolbar>
      <FormatText />
      <Monocode />
      {/*<InsertLink />*/}
      <HR />
      <div ref={typeRef} onClick={() => setIsTypeOpen(!isTypeOpen)}>
        <ToolbarItem>Type ⭣</ToolbarItem>
        <Dropdown isTypeOpen={isTypeOpen} id={"s"}>
          <NormalParagraph />
          <Heading />
          <CodeBlock />
        </Dropdown>
      </div>
      <UnDoReDo />
      <Listing />
      <Blockquote />
    </Toolbar>
  );
};

export default ToolbarPlugin;
