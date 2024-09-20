import Header from "../components/Header";
import PMEditor from "../components/PMEditor";
import Layout from "../components/Layout";
import { NextPage } from "next";

const Home: NextPage = () => (
  <>
    <Layout>
      <Header />
      <PMEditor />
    </Layout>
  </>
);
export default Home;
