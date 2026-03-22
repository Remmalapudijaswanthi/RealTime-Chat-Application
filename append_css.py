import os

css_block = """
/* ============================== */
/* ===== THEME SETTINGS UI ====== */
/* ============================== */

.theme-preview-panel {
  width: 100%;
  height: 160px;
  background: var(--bg-primary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  margin-bottom: 24px;
  display: flex;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: background 0.4s ease;
}

.theme-preview-sidebar {
  width: 30%;
  border-right: 1px solid var(--border-color);
  background: var(--bg-secondary);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.theme-preview-chat {
  flex: 1;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  justify-content: flex-end;
  background-color: var(--chat-bg-color, transparent);
  background-image: var(--chat-bg-image, none);
  background-size: var(--chat-bg-size, auto);
  transition: background-color 0.4s ease, background-image 0.4s ease;
}

.fake-chat-item {
  height: 20px;
  border-radius: 4px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
}

.fake-bubble {
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  max-width: 80%;
  color: var(--text-primary);
}

.fake-bubble.received {
  background: var(--bubble-received);
  align-self: flex-start;
  border-bottom-left-radius: 4px;
}
.fake-bubble.sent {
  background: var(--bubble-sent);
  color: white;
  align-self: flex-end;
  border-bottom-right-radius: 4px;
}

.bg-cards-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.bg-preview-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.bg-preview-box {
  width: 100%;
  aspect-ratio: 1; /* Square */
  border-radius: 10px;
  border: 2px solid transparent;
  position: relative;
  transition: all 0.2s ease;
  overflow: hidden;
}

.bg-preview-box:hover {
  border-color: #818CF8;
  transform: scale(1.05);
}

.bg-preview-card.selected .bg-preview-box {
  border-color: #C084FC;
  box-shadow: inset 0 0 0 1px #C084FC;
}

.bg-preview-check {
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  background: #C084FC;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 10px;
  font-weight: bold;
}

.bg-preview-label {
  font-size: 11px;
  color: #6B7280;
  text-align: center;
}

/* Custom Gradient Builder */
.gradient-builder {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 24px;
}
.gradient-builder-row {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 12px;
}
.gradient-dir-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}
.gradient-dir-btn {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
}
.gradient-dir-btn.active {
  border-color: var(--accent-purple);
  color: var(--accent-purple);
  background: rgba(124, 58, 237, 0.1);
}
.color-picker-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}
.color-picker-wrap label {
  font-size: 11px;
  color: var(--text-muted);
}
.color-picker-wrap input[type="color"] {
  height: 32px;
  width: 100%;
  cursor: pointer;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 0;
}
.gradient-preview {
  width: 100%;
  height: 80px;
  border-radius: 8px;
  margin-bottom: 12px;
  border: 1px solid var(--border-color);
}
"""

with open("c:/Users/remma/OneDrive/Documents/GitHub/Real-time-Chat-Application/client/src/index.css", "a", encoding="utf-8") as f:
    f.write("\\n" + css_block + "\\n")
