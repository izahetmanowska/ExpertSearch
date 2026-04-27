import React from 'react';
import './App.css';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import SearchCard from './SearchCard';
import SearchResultsPage from './SearchResultsPage';
import { Navigate, Route, Routes } from 'react-router-dom';


function App() {
  return (
    <div className="App">
      <header className="App-header">
      <Container>
        <Row>
          <Col md={{ span: 10, offset: 1 }}>
            <Routes>
              <Route path="/" element={<SearchCard />} />
              <Route path="/search" element={<SearchResultsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Col>
        </Row>
      </Container>
      </header>
    </div>
  );
}

export default App;
