export default function Loading() {
  return (
    <div className="loading-screen">
      <div className="loading-logo-container">
        <img 
          src="/nova_v2.jpg" 
          alt="NovaFeeds" 
          className="loading-logo"
        />
      </div>
      <div className="loading-text">
        Loading Intelligence...
      </div>
    </div>
  );
}
