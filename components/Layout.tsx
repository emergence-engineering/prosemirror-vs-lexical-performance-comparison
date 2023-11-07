import styled from "styled-components";
import { FC, ReactNode } from "react";
import Head from "next/head";

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: white;
  max-width: 90rem;
  margin: 0 auto;
`;

export const Root = styled.div`
  display: flex;
  position: relative;
  flex: 1;
  flex-direction: column;
  width: 100vw;
  padding: 0 150px;
  max-width: 1440px;
  background-color: white;
`;

interface PageProps {
  children: ReactNode;
}

const Layout: FC<PageProps> = ({ children }) => (
  <Wrapper>
    <Root>
      <Head>
        <title>PM vs. Lexical</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {children}
    </Root>
  </Wrapper>
);

export default Layout;
