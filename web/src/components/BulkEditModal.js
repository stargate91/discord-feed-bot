"use client";
import { useState, useEffect, useRef } from 'react';
import MultiSelect from './MultiSelect';
import { X, Save, AlertCircle, Info } from 'lucide-react';
import { useToast } from "@/context/ToastContext";
import { useSession } from 'next-auth/react';
import ColorPicker from './ColorPicker';

export default function BulkEditModal({ isOpen, onClose, onSave, monitorCount, guildId, tier = 0, isPremium = false }) {
  const { addToast } = useToast();
  const { data: session } = useSession();
  const isMasterUser = session?.user?.role === 'master';
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
    use_color: false,
    use_native: false,
    use_native_player: false,
    use_custom_image: false,
    custom_image: ''
  });

  const colorInputRef = useRef(null);
  const isLocked = !isMasterUser && !isPremium && tier < 2;

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
    if (formData.use_native) updateData.use_native_player = formData.use_native_player;
    if (formData.use_custom_image) updateData.custom_image = formData.custom_image;

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
    <div className="ui-modal-overlay">
      <div className="ui-modal-content" style={{ maxWidth: '600px' }}>
        <div className="ui-modal-header">
          <div>
            <h3 className="ui-modal-title">Bulk Edit Monitors</h3>
            <p className="ui-modal-subtitle">Updating {monitorCount} selected monitors</p>
          </div>
          <button className="ui-modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        {isLocked ? (
          <div className="ui-modal-body" style={{ textAlign: 'center', padding: '4rem 2.5rem' }}>
            <div style={{ width: '80px', height: '80px', background: 'rgba(255, 183, 3, 0.1)', color: '#ffb703', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 0 20px rgba(255, 183, 3, 0.2)' }}>
              <AlertCircle size={40} />
            </div>
            <h3 className="ui-modal-title" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Professional Feature</h3>
            <p className="ui-modal-subtitle" style={{ fontSize: '1.1rem', maxWidth: '400px', margin: '0 auto 2.5rem', textTransform: 'none', color: 'rgba(255,255,255,0.6)' }}>
              Tidying up many monitors at once is a professional-grade tool. Upgrade your server to unlock bulk editing.
            </p>
            <button className="ui-btn ui-btn-primary" onClick={onClose} style={{ padding: '0.8rem 3rem' }}>I Understand</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="ui-modal-body" style={{ padding: '2rem' }}>
            <div style={{ background: 'rgba(123, 44, 191, 0.05)', border: '1px solid rgba(123, 44, 191, 0.1)', padding: '1.25rem', borderRadius: '20px', display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }}>
              <Info size={20} style={{ color: 'var(--accent-color)' }} />
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5' }}>
                Only checked fields will be updated on all <strong>{monitorCount}</strong> monitors. Other settings will remain unchanged.
              </p>
            </div>

            <div className="ui-form-group" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                <input type="checkbox" checked={formData.use_channels} onChange={e => setFormData({...formData, use_channels: e.target.checked})} style={{ width: '20px', height: '20px', accentColor: 'var(--accent-color)', cursor: 'pointer' }} />
                <label className="ui-form-label" style={{ marginBottom: 0, fontSize: '1rem' }}>Update Target Channels</label>
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

            <div className="ui-form-group" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                <input type="checkbox" checked={formData.use_roles} onChange={e => setFormData({...formData, use_roles: e.target.checked})} style={{ width: '20px', height: '20px', accentColor: 'var(--accent-color)', cursor: 'pointer' }} />
                <label className="ui-form-label" style={{ marginBottom: 0, fontSize: '1rem' }}>Update Ping Roles</label>
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

            <div className="ui-form-group" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                <input type="checkbox" checked={formData.use_color} onChange={e => setFormData({...formData, use_color: e.target.checked})} style={{ width: '20px', height: '20px', accentColor: 'var(--accent-color)', cursor: 'pointer' }} />
                <label className="ui-form-label" style={{ marginBottom: 0, fontSize: '1rem' }}>Update Embed Color</label>
              </div>
              <div style={{ 
                opacity: formData.use_color ? 1 : 0.4, 
                pointerEvents: formData.use_color ? 'auto' : 'none'
              }}>
                <ColorPicker 
                  value={formData.embed_color} 
                  onChange={(color) => setFormData({...formData, embed_color: color})}
                />
              </div>
            </div>

            <div className="ui-form-group" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                <input type="checkbox" checked={formData.use_native} onChange={e => setFormData({...formData, use_native: e.target.checked})} style={{ width: '20px', height: '20px', accentColor: 'var(--accent-color)', cursor: 'pointer' }} />
                <label className="ui-form-label" style={{ marginBottom: 0, fontSize: '1rem' }}>Update Native Player</label>
              </div>
              <div style={{ opacity: formData.use_native ? 1 : 0.4, pointerEvents: formData.use_native ? 'auto' : 'none' }}>
                <div style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  padding: '1rem 1.5rem', 
                  borderRadius: '16px', 
                  border: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label className="ui-form-label" style={{ color: 'white', marginBottom: 0 }}>Use Native Discord Player</label>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Only applies to YouTube monitors.</p>
                  </div>
                  <label className="ui-switch">
                    <input 
                      type="checkbox" 
                      checked={formData.use_native_player} 
                      onChange={(e) => setFormData({...formData, use_native_player: e.target.checked})}
                    />
                    <span className="ui-switch-slider"></span>
                  </label>
                </div>
              </div>
            </div>

            <div className="ui-form-group" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', opacity: isPremium || tier >= 2 ? 1 : 0.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                <input type="checkbox" checked={formData.use_custom_image} onChange={e => setFormData({...formData, use_custom_image: e.target.checked})} style={{ width: '20px', height: '20px', accentColor: 'var(--accent-color)', cursor: 'pointer' }} />
                <label className="ui-form-label" style={{ marginBottom: 0, fontSize: '1rem' }}>Update Custom Image URL</label>
              </div>
              <div style={{ opacity: formData.use_custom_image ? 1 : 0.4, pointerEvents: formData.use_custom_image ? 'auto' : 'none' }}>
                <input 
                  type="text"
                  className="ui-input"
                  placeholder="https://imgur.com/example.png"
                  value={formData.custom_image}
                  onChange={(e) => setFormData({...formData, custom_image: e.target.value})}
                />
              </div>
            </div>

            <div className="ui-modal-footer">
              <button type="button" className="ui-btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }} onClick={onClose}>Cancel</button>
              <button type="submit" className="ui-btn ui-btn-primary" disabled={loading}>
                {loading ? 'Updating...' : `Apply to ${monitorCount} Monitors`}
              </button>
            </div>
          </form>
        )}
      </div>

    </div>
  );
}
