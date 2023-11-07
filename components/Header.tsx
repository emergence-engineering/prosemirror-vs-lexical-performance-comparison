import styled from "styled-components";
import Image from "next/image";
import Link from "next/link";

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 5rem;
  padding: 1rem;
  background-color: white;
  border-bottom: thin solid #bbbbbb;
`;

const Logo = styled.a`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16rem;
  cursor: pointer;
`;

const Navbar = styled.div`
  display: flex;
  justify-content: space-evenly;
`;

const Nav = styled.div`
  padding: 0 2rem;
  cursor: pointer;
  color: black;

  :hover {
    text-shadow: 0 0 25px #ff4f3f;
  }
`;

const Header = () => {
  return (
    <Wrapper>
      <Logo href={"http://emergence-engineering.com"} target={"_blank"}>
        <Image src={"/ee-logo.svg"} width={250} height={42} alt={""} />
      </Logo>
      <Navbar>
        <Nav>
          <Link href={"/"}>ProseMirror</Link>
        </Nav>
        <Nav>
          <Link href={"/lexical"}>Lexical</Link>
        </Nav>
      </Navbar>
    </Wrapper>
  );
};

export default Header;
