import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  LogOut, 
  Users, 
  Lock, 
  Globe, 
  Search,
  MessageCircle,
  Settings,
  Refresh
} from 'lucide-react';
import AuthContext from '../../contexts/AuthContext';
import SocketContext from '../../contexts/SocketContext';
import LoadingSpinner from '../UI/LoadingSpinner';

const Lobby = () => {
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPrivate, setNewRoomPrivate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  
  const { user, logout } = useContext(AuthContext);
  const socket = useContext(SocketContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (socket) {
      // Request rooms list
      socket.emit('get_rooms');
      
      // Listen for rooms list
      socket.on('rooms_list', (roomsList) => {
        setRooms(roomsList);
        setIsLoading(false);
      });

      // Listen for new rooms
      socket.on('new_room_available', (newRoom) => {
        setRooms(prev => [newRoom, ...prev]);
      });

      // Listen for room created
      socket.on('room_created', (room) => {
        setShowCreateRoom(false);
        setNewRoomName('');
        setNewRoomPrivate(false);
        navigate(`/room/${room.id}`);
      });

      // Listen for errors
      socket.on('error', (error) => {
        setError(error.message);
        setTimeout(() => setError(''), 5000);
      });

      return () => {
        socket.off('rooms_list');
        socket.off('new_room_available');
        socket.off('room_created');
        socket.off('error');
      };
    }
  }, [socket, navigate]);

  const handleCreateRoom = (e) => {
    e.preventDefault();
    
    if (!newRoomName.trim()) {
      setError('Room name is required');
      return;
    }

    if (newRoomName.length < 2 || newRoomName.length > 50) {
      setError('Room name must be between 2 and 50 characters');
      return;
    }

    socket.emit('create_room', {
      name: newRoomName.trim(),
      isPrivate: newRoomPrivate
    });
  };

  const handleJoinRoom = (roomId) => {
    navigate(`/room/${roomId}`);
  };

  const handleRefreshRooms = () => {
    setIsLoading(true);
    socket.emit('get_rooms');
  };

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <LoadingSpinner message="Loading chatrooms..." />;
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ margin: 0, color: 'var(--text-primary)' }}>
            🛡️ Secure Chatroom
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
            Welcome back, {user?.username}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button className="btn btn-secondary btn-icon" title="Settings">
            <Settings size={18} />
          </button>
          <button 
            className="btn btn-secondary"
            onClick={logout}
            title="Logout"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', maxHeight: 'calc(100vh - 80px)' }}>
        {/* Sidebar */}
        <div style={{
          width: '350px',
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Search and Create */}
          <div style={{ padding: '1.5rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ position: 'relative' }}>
                <Search 
                  size={18} 
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }}
                />
                <input
                  type="text"
                  placeholder="Search rooms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </div>
            
            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={() => setShowCreateRoom(true)}
            >
              <Plus size={18} />
              Create Room
            </button>
          </div>

          {/* Rooms List */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            <div style={{ padding: '0 1.5rem' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '1rem'
              }}>
                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
                  Available Rooms ({filteredRooms.length})
                </h3>
                <button
                  className="btn btn-secondary btn-icon"
                  onClick={handleRefreshRooms}
                  title="Refresh rooms"
                >
                  <Refresh size={16} />
                </button>
              </div>

              {filteredRooms.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '2rem',
                  color: 'var(--text-muted)'
                }}>
                  {searchQuery ? 'No rooms match your search' : 'No rooms available'}
                </div>
              ) : (
                <div className="list">
                  {filteredRooms.map((room) => (
                    <div
                      key={room.id}
                      className="list-item"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleJoinRoom(room.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {room.is_private ? (
                            <Lock size={18} color="white" />
                          ) : (
                            <Globe size={18} color="white" />
                          )}
                        </div>
                        
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            fontWeight: '500',
                            color: 'var(--text-primary)',
                            marginBottom: '2px'
                          }}>
                            {room.name}
                          </div>
                          <div style={{ 
                            fontSize: '12px',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <Users size={12} />
                            {room.member_count || 0} members
                            {room.creator_username && (
                              <>
                                • Created by {room.creator_username}
                              </>
                            )}
                          </div>
                        </div>
                        
                        <MessageCircle size={16} color="var(--text-muted)" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Area */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'var(--bg-primary)'
        }}>
          <div style={{ textAlign: 'center', maxWidth: '400px', padding: '2rem' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem'
            }}>
              <MessageCircle size={32} color="white" />
            </div>
            
            <h2 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>
              Welcome to Secure Chatroom
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              Select a room from the sidebar to start chatting, or create a new room to begin your own conversation.
            </p>
            
            <div style={{
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--border-radius)',
              padding: '1.5rem',
              textAlign: 'left'
            }}>
              <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>
                🔐 Security Features
              </h4>
              <ul style={{ 
                color: 'var(--text-secondary)', 
                fontSize: '14px',
                lineHeight: '1.6'
              }}>
                <li>End-to-end encryption for private messages</li>
                <li>Secure authentication with JWT tokens</li>
                <li>Real-time message delivery</li>
                <li>No message content stored on servers</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Create Room Modal */}
      {showCreateRoom && (
        <div className="overlay">
          <div className="modal">
            <h2 style={{ marginBottom: '1.5rem' }}>Create New Room</h2>
            
            {error && (
              <div className="error-message" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}
            
            <form onSubmit={handleCreateRoom}>
              <div className="form-group">
                <label className="form-label">Room Name</label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="form-input"
                  placeholder="Enter room name"
                  maxLength={50}
                  autoFocus
                />
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {newRoomName.length}/50 characters
                </div>
              </div>
              
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newRoomPrivate}
                    onChange={(e) => setNewRoomPrivate(e.target.checked)}
                  />
                  <span>Make this room private</span>
                </label>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Private rooms require invitations to join
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  Create Room
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    setShowCreateRoom(false);
                    setNewRoomName('');
                    setNewRoomPrivate(false);
                    setError('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lobby;