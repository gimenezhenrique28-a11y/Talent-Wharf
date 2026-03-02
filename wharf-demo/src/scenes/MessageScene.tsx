import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

const INTER_FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

/**
 * Scene 2: Message View (4 seconds, 120 frames)
 * Exact LinkedIn DM interface matching the reference screenshot
 */
export const MessageScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background fade in
  const bgP = spring({ frame, fps, config: { damping: 20, stiffness: 140 } });
  const bgOpacity = interpolate(bgP, [0, 1], [0, 1], { extrapolateRight: "clamp" });

  // Scroll animation - conversation scrolls up to show message
  const scrollOffset = interpolate(frame, [0, 40], [0, 0], { extrapolateRight: "clamp" });

  // Checkmark appears after viewing
  const checkmarkFrame = Math.max(0, frame - 80);
  const checkmarkOpacity = interpolate(checkmarkFrame, [0, 8], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: "#ffffff",
        fontFamily: INTER_FONT,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* LinkedIn Header */}
      <div
        style={{
          height: 52,
          background: "#ffffff",
          borderBottom: "1px solid #d0d0d0",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          gap: 16,
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 700, color: "#0a66c2" }}>in</div>
        <div
          style={{
            flex: 1,
            height: 36,
            borderRadius: 20,
            background: "#f0f0f0",
            padding: "0 16px",
            display: "flex",
            alignItems: "center",
            fontSize: 14,
            color: "#999",
            gap: 8,
          }}
        >
          🔍 Search messages
        </div>
        <div style={{ display: "flex", gap: 20, fontSize: 18, color: "#666" }}>
          <span>⋯</span>
          <span>✏️</span>
        </div>
      </div>

      {/* Main content - Two column layout */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Left Sidebar - Inbox list */}
        <div
          style={{
            width: "30%",
            borderRight: "1px solid #e5e5e5",
            display: "flex",
            flexDirection: "column",
            background: "#ffffff",
          }}
        >
          {/* Inbox tabs */}
          <div
            style={{
              padding: "12px 16px",
              display: "flex",
              gap: 8,
              borderBottom: "1px solid #e5e5e5",
              overflowX: "auto",
            }}
          >
            <div
              style={{
                padding: "8px 16px",
                background: "#057a3f",
                color: "white",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              Inbox ▼
            </div>
            {["Jobs", "Unread", "Connections", "InMail", "Starred"].map((tab) => (
              <div
                key={tab}
                style={{
                  padding: "8px 12px",
                  border: "1px solid #d0d0d0",
                  borderRadius: 20,
                  fontSize: 12,
                  color: "#666",
                  whiteSpace: "nowrap",
                }}
              >
                {tab}
              </div>
            ))}
          </div>

          {/* Contact list */}
          <div style={{ flex: 1, overflow: "auto" }}>
            {[
              { name: "Sarah Mitchell", role: "Design Lead", preview: "Great work on the...", time: "Feb 19" },
              { name: "Marcus Chen", role: "Product Manager", preview: "Let's connect soon", time: "Feb 18" },
              { name: "James Wilson", role: "CTO @ StartupXYZ", preview: "Your portfolio is...", time: "Feb 16" },
            ].map((contact, idx) => (
              <div
                key={idx}
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid #f0f0f0",
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  cursor: "pointer",
                  background: idx === 0 ? "#f3f2ef" : "white",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: `hsl(${(idx * 47) % 360}, 70%, 55%)`,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: 600,
                    fontSize: 16,
                  }}
                >
                  {contact.name.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#000", marginBottom: 2 }}>
                    {contact.name}
                  </div>
                  <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>{contact.role}</div>
                  <div style={{ fontSize: 12, color: "#666", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {contact.preview}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "#999", flexShrink: 0 }}>{contact.time}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel - Conversation thread */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: "#ffffff",
            opacity: bgOpacity,
          }}
        >
          {/* Chat header with contact info */}
          <div
            style={{
              padding: "12px 20px",
              borderBottom: "1px solid #e5e5e5",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "#0a66c2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                SK
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#000" }}>Sarah Kim</div>
                <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>
                  🏢 Senior Engineer @ TechCorp · 🕐 +05 PM
                </div>
              </div>
            </div>
            <div style={{ fontSize: 18, color: "#999" }}>⋯</div>
          </div>

          {/* Message thread */}
          <div
            style={{
              flex: 1,
              padding: "20px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {/* First message from sender */}
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#0a66c2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: 600,
                  fontSize: 12,
                  flexShrink: 0,
                }}
              >
                SK
              </div>
              <div>
                <div
                  style={{
                    background: "#e7f3ff",
                    padding: "12px 16px",
                    borderRadius: 12,
                    fontSize: 13,
                    color: "#000",
                    lineHeight: 1.5,
                    maxWidth: 320,
                  }}
                >
                  Hi there! I've been really impressed with your work and would love to connect. I'm looking for someone
                  with your expertise for an exciting opportunity.
                </div>
                <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>9:45 AM</div>
              </div>
            </div>

            {/* Response message */}
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", justifyContent: "flex-end" }}>
              <div>
                <div
                  style={{
                    background: "#f0f0f0",
                    padding: "12px 16px",
                    borderRadius: 12,
                    fontSize: 13,
                    color: "#000",
                    lineHeight: 1.5,
                    maxWidth: 320,
                    textAlign: "right",
                  }}
                >
                  Thanks for reaching out! I'm always interested in hearing about new opportunities.
                </div>
                <div style={{ fontSize: 11, color: "#999", marginTop: 4, textAlign: "right" }}>
                  10:12 AM
                </div>
              </div>
            </div>

            {/* Another incoming message */}
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#0a66c2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: 600,
                  fontSize: 12,
                  flexShrink: 0,
                }}
              >
                SK
              </div>
              <div>
                <div
                  style={{
                    background: "#e7f3ff",
                    padding: "12px 16px",
                    borderRadius: 12,
                    fontSize: 13,
                    color: "#000",
                    lineHeight: 1.5,
                    maxWidth: 320,
                  }}
                >
                  Perfect! Let's set up a call this week. Are you free Thursday afternoon?
                </div>
                <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>11:30 AM</div>
              </div>
            </div>
          </div>

          {/* Message input area */}
          <div style={{ padding: "16px 20px", borderTop: "1px solid #e5e5e5" }}>
            <input
              type="text"
              placeholder="Write a message..."
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "1px solid #d0d0d0",
                borderRadius: 20,
                fontSize: 14,
                fontFamily: INTER_FONT,
                outline: "none",
              }}
            />
          </div>
        </div>
      </div>

    </AbsoluteFill>
  );
};
