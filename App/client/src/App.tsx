import React, { useEffect } from 'react';
import './App.css';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import SearchPage from './pages/SearchPage';
import SearchResultsPage from './pages/SearchResultsPage';
import ExpertDetailPage from './pages/ExpertDetailPage';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';

function FileRedirect() {
  const { encodedUrl } = useParams();

  useEffect(() => {
    if (!encodedUrl) {
      return;
    }

    const decodedUrl = decodeURIComponent(encodedUrl);
    window.open(decodedUrl, '_blank', 'noopener,noreferrer');
  }, [encodedUrl]);

  return <Navigate to="/" replace />;
}


function App() {
  return (
    <div className="App">
      <header className="App-header">
      <Container>
        <Row>
          <Col md={{ span: 10, offset: 1 }}>
            <Routes>
              <Route path="/" element={<SearchPage />} />
              <Route path="/search" element={<SearchResultsPage />} />
              <Route path="/expert" element={<ExpertDetailPage />} />
              <Route path="/file/:encodedUrl" element={<FileRedirect />} />
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
