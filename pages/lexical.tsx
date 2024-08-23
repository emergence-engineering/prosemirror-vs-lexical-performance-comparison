import { Inter } from "@next/font/google";
import Header from "../components/Header";
import Layout from "../components/Layout";
import { NextPage } from "next";
import LexicalEditor from "../components/LexicalEditor";

const inter = Inter({ subsets: ["latin"] });

const Home: NextPage = () => (
  <>
    <Layout>
      <Header />
      <LexicalEditor />
    </Layout>
  </>
);
export default Home;