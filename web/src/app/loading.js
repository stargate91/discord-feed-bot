export default function Loading() {
  return (
    <div className="loading-screen">
      <div className="loading-logo-container">
        <img 
          src="/nova.jpg" 
          alt="NOVA" 
          className="loading-logo"
        />
      </div>
      <div className="loading-text">
        Loading Intelligence...
      </div>
    </div>
  );
}
