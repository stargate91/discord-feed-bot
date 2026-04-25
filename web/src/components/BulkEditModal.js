"use client";
import { useState, useEffect, useRef } from 'react';
import MultiSelect from './MultiSelect';
import { X, Save, AlertCircle, Info } from 'lucide-react';
import { useToast } from "@/context/ToastContext";

export default function BulkEditModal({ isOpen, onClose, onSave, monitorCount, guildId, tier = 0, isPremium = false }) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [guildChannels, setGuildChannels] = useState([]);
  const [guildRoles, setGuildRoles] = useState([]);
  const [loadingContext, setLoadingContext] = useState(false);
  
  const [formData, setFormData] = useState({
    target_channels: [],
    target_roles: [],
    embed_color: '#3d3f45',
    use_channels: false,
    use_roles: false,
    use_color: false
  });

  const colorInputRef = useRef(null);
  const isLocked = tier < 2 && !(isPremium && tier === 0);

  useEffect(() => {
    if (isOpen && guildId) {
      setLoadingContext(true);
      Promise.all([
        fetch(`/api/guilds/${guildId}/channels`),
        fetch(`/api/guilds/${guildId}/roles`)
      ]).then(async ([chanRes, roleRes]) => {
        if (chanRes.ok) setGuildChannels(await chanRes.json());
        if (roleRes.ok) setGuildRoles(await roleRes.json());
        setLoadingContext(false);
      });
    }
  }, [isOpen, guildId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLocked) {
      addToast("Bulk editing requires Professional Tier (Tier 2) or higher.", "error", "Locked");
      return;
    }

    const updateData = {};
    if (formData.use_channels) updateData.target_channels = formData.target_channels;
    if (formData.use_roles) updateData.target_roles = formData.target_roles;
    if (formData.use_color) updateData.embed_color = formData.embed_color;

    if (Object.keys(updateData).length === 0) {
      addToast("Please select at least one field to update.", "info", "No changes");
      return;
    }

    setLoading(true);
    await onSave(updateData);
    setLoading(false);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div>
            <h3>Bulk Edit Monitors</h3>
            <p className="subtitle">Updating {monitorCount} selected monitors</p>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        {isLocked ? (
          <div className="locked-container">
            <AlertCircle size={48} color="#ffb703" />
            <h3>Professional Feature</h3>
            <p>Tidying up many monitors at once is a professional-grade tool. Upgrade your server to unlock bulk editing.</p>
            <button className="btn-primary" onClick={onClose}>I Understand</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="info-box">
              <Info size={18} />
              <span>Only checked fields will be updated on all {monitorCount} monitors. Other settings will remain unchanged.</span>
            </div>

            <div className="form-group-bulk">
              <div className="bulk-check-label">
                <input type="checkbox" checked={formData.use_channels} onChange={e => setFormData({...formData, use_channels: e.target.checked})} />
                <label>Update Target Channels</label>
              </div>
              <div style={{ opacity: formData.use_channels ? 1 : 0.4, pointerEvents: formData.use_channels ? 'auto' : 'none' }}>
                <MultiSelect 
                  options={guildChannels}
                  value={formData.target_channels}
                  onChange={(val) => setFormData({...formData, target_channels: val})}
                  placeholder={loadingContext ? "Loading..." : "Select channels"}
                />
              </div>
            </div>

            <div className="form-group-bulk">
              <div className="bulk-check-label">
                <input type="checkbox" checked={formData.use_roles} onChange={e => setFormData({...formData, use_roles: e.target.checked})} />
                <label>Update Ping Roles</label>
              </div>
              <div style={{ opacity: formData.use_roles ? 1 : 0.4, pointerEvents: formData.use_roles ? 'auto' : 'none' }}>
                <MultiSelect 
                  options={guildRoles}
                  value={formData.target_roles}
                  onChange={(val) => setFormData({...formData, target_roles: val})}
                  placeholder={loadingContext ? "Loading..." : "Select roles"}
                />
              </div>
            </div>

            <div className="form-group-bulk">
              <div className="bulk-check-label">
                <input type="checkbox" checked={formData.use_color} onChange={e => setFormData({...formData, use_color: e.target.checked})} />
                <label>Update Embed Color</label>
              </div>
              <div style={{ opacity: formData.use_color ? 1 : 0.4, pointerEvents: formData.use_color ? 'auto' : 'none', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input 
                  type="color" 
                  ref={colorInputRef}
                  value={formData.embed_color}
                  onChange={(e) => setFormData({...formData, embed_color: e.target.value})}
                  style={{ display: 'none' }}
                />
                <div 
                  className="color-trigger"
                  onClick={() => colorInputRef.current.click()}
                  style={{ background: formData.embed_color }}
                ></div>
                <input 
                  type="text" 
                  value={formData.embed_color} 
                  onChange={(e) => setFormData({...formData, embed_color: e.target.value})}
                  placeholder="#3d3f45"
                  className="styled-input-main"
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Updating...' : `Apply to ${monitorCount} Monitors`}
              </button>
            </div>
          </form>
        )}
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.85); backdrop-filter: blur(12px);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 2rem;
        }
        .modal-content {
          width: 100%; max-width: 550px;
          background: #12121a; border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 40px 100px rgba(0,0,0,0.8); padding: 2.5rem; border-radius: 28px;
          position: relative; overflow: hidden;
        }
        .modal-content::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px;
          background: linear-gradient(90deg, transparent, var(--accent-color), transparent);
        }
        .modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
        .subtitle { color: var(--accent-hover); font-size: 0.8rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
        
        .info-box {
          background: rgba(123, 44, 191, 0.05);
          border: 1px solid rgba(123, 44, 191, 0.1);
          padding: 1rem;
          border-radius: 14px;
          display: flex;
          gap: 12px;
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 2rem;
          line-height: 1.5;
        }

        .form-group-bulk {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 1.5rem;
          background: rgba(255,255,255,0.01);
          padding: 1.5rem;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.04);
          transition: all 0.3s;
        }
        .form-group-bulk:hover {
          background: rgba(255,255,255,0.02);
          border-color: rgba(255,255,255,0.08);
        }

        .bulk-check-label {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 4px;
        }
        .bulk-check-label input { 
          width: 20px; height: 20px; cursor: pointer; 
          accent-color: var(--accent-color);
          border-radius: 6px;
        }
        .bulk-check-label label { font-size: 0.95rem; font-weight: 700; color: white; cursor: pointer; }

        .styled-input-main {
          background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);
          color: white; padding: 0.8rem 1rem; border-radius: 12px; outline: none; transition: all 0.25s;
          font-family: monospace;
        }
        .styled-input-main:focus { border-color: var(--accent-color); background: rgba(0,0,0,0.5); }
        
        .color-trigger { 
          width: 44px; height: 44px; border-radius: 12px; border: 2px solid rgba(255,255,255,0.1); 
          cursor: pointer; transition: transform 0.2s;
        }
        .color-trigger:hover { transform: scale(1.05); }

        .locked-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 1.5rem;
          padding: 3rem 0;
        }
        .locked-container h3 { font-size: 1.5rem; font-weight: 800; }
        .locked-container p { color: rgba(255,255,255,0.5); font-size: 0.95rem; max-width: 300px; line-height: 1.6; }

        .modal-footer { display: flex; gap: 1rem; margin-top: 1.5rem; }
        .btn-ghost { 
          flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); 
          color: white; padding: 1rem; border-radius: 16px; font-weight: 700; cursor: pointer;
          transition: all 0.2s;
        }
        .btn-ghost:hover { background: rgba(255,255,255,0.1); }
        .btn-primary { 
          flex: 2; background: var(--accent-color); border: none; color: white; padding: 1rem; border-radius: 16px; 
          font-weight: 800; cursor: pointer; transition: all 0.3s;
          box-shadow: 0 10px 25px rgba(123, 44, 191, 0.3);
        }
        .btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 15px 35px rgba(123, 44, 191, 0.4); filter: brightness(1.1); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .close-btn { 
          background: rgba(255,255,255,0.05); border: none; color: white; width: 36px; height: 36px; 
          border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .close-btn:hover { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
      `}</style>
    </div>
  );
}
