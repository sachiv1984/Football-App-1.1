import React from 'react';
import { Button, Card, Badge, Table, Modal } from './components';

const ComponentTest = () => {
  const [showModal, setShowModal] = React.useState(false);
  
  // Sample data for table
  const sampleData = [
    { name: 'Arsenal', points: 50, wins: 15 },
    { name: 'Man City', points: 48, wins: 14 },
  ];
  
  const columns = [
    { key: 'name', title: 'Team', dataIndex: 'name' },
    { key: 'points', title: 'Points', dataIndex: 'points' },
    { key: 'wins', title: 'Wins', dataIndex: 'wins' },
  ];

  return (
    <div className="container mx-auto p-8 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Design System Test</h1>
      
      {/* Button Tests */}
      <Card className="p-6">
        <Card.Header title="Button Component Test" />
        <Card.Body>
          <div className="flex gap-4 flex-wrap">
            <Button variant="primary">Primary (Electric Yellow)</Button>
            <Button variant="secondary">Secondary (Deep Blue)</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </div>
          <div className="flex gap-4 flex-wrap mt-4">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button loading>Loading</Button>
          </div>
        </Card.Body>
      </Card>

      {/* Badge Tests */}
      <Card className="p-6">
        <Card.Header title="Badge Component Test" />
        <Card.Body>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="primary">Primary Badge</Badge>
            <Badge variant="secondary">Secondary Badge</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
            <Badge dot variant="success" />
            <Badge removable onRemove={() => alert('Remove clicked')}>Removable</Badge>
          </div>
        </Card.Body>
      </Card>

      {/* Table Test */}
      <Card className="p-6">
        <Card.Header title="Table Component Test" />
        <Card.Body>
          <Table 
            data={sampleData} 
            columns={columns}
            hover
            striped
            sortable
          />
        </Card.Body>
      </Card>

      {/* Modal Test */}
      <Card className="p-6">
        <Card.Header title="Modal Component Test" />
        <Card.Body>
          <Button onClick={() => setShowModal(true)}>Open Modal</Button>
          <Modal 
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            title="Test Modal"
          >
            <Modal.Body>
              This modal should have your brand styling!
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button variant="primary">Confirm</Button>
            </Modal.Footer>
          </Modal>
        </Card.Body>
      </Card>

      {/* Football-specific CSS test */}
      <Card className="p-6">
        <Card.Header title="Football CSS Classes Test" />
        <Card.Body>
          <div className="fixture-card">
            <div className="flex items-center justify-center gap-4 p-4">
              <div className="team-logo-lg bg-red-500 rounded-full"></div>
              <span className="match-score">2-1</span>
              <div className="team-logo-lg bg-blue-500 rounded-full"></div>
            </div>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default ComponentTest;