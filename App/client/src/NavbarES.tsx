import Container from 'react-bootstrap/Container';
import Navbar from 'react-bootstrap/Navbar';
import siteLogo from './site-logo.png';
import Nav from 'react-bootstrap/Nav';

function NavbarES() {
  return (
    <>
      <Navbar className="bg-body-tertiary">
        <Container>
          <Navbar.Brand href="#home">
            <img
              alt=""
              src={siteLogo}
              width="30"
              height="30"
              className="d-inline-block align-top"
            />{' '}
            Expert Search
          </Navbar.Brand>
          <Nav className="ms-auto">
            <Nav.Item>
              <Nav.Link href="/home">Home</Nav.Link>
            </Nav.Item>
          </Nav>
        </Container>
      </Navbar>
    </>
  );
}

export default NavbarES;