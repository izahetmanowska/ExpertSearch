import React from 'react';
import './App.css';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import SearchCard from './SearchCard';
import SearchResultsPage from './SearchCard';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';


function App() {
  return (
    <div className="App">
      <header className="App-header">
      <Container>
        <Row>
          <Col md={{ span: 10, offset: 1 }}>
              <BrowserRouter>
              <Routes>
                <Route path="/" element={<SearchCard/>} />           {/* default page */}
                <Route path="/search" element={<SearchResultsPage/>} />
                <Route path="*" element={<Navigate to="/" replace />} /> {/* fallback */}
              </Routes>
            </BrowserRouter>
          </Col>
        </Row>
      </Container>
      </header>
    </div>
  );
}

export default App;
