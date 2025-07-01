import React from 'react';

const LoadingSpinner = ({ message = "Loading..." }) => {
  return (
    <div className="loading-spinner">
      <div>
        <div className="spinner"></div>
        <div className="loading-text">{message}</div>
      </div>
    </div>
  );
};

export default LoadingSpinner;