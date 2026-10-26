export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b0b0b",
        color: "#d1fadf",
        fontFamily: "monospace",
        padding: "2rem",
      }}
    >
      <div
        style={{
          maxWidth: "42rem",
          border: "1px solid #2f6f4f",
          padding: "2rem",
          background: "#0f1a14",
        }}
      >
        <h1
          style={{
            fontSize: "1.25rem",
            marginBottom: "1rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Prototype paused
        </h1>
        <p style={{ lineHeight: 1.7, marginBottom: "1rem" }}>
          Phreaking Fun is a paused prototype. It is Sepolia testnet only and
          not production. Do not send mainnet funds.
        </p>
        <p style={{ lineHeight: 1.7, marginBottom: "1rem" }}>
          This project is not audited and is not a live product. The repository
          is kept for reference only.
        </p>
        <p style={{ lineHeight: 1.7, fontSize: "0.875rem", opacity: 0.75 }}>
          No support or new feature work is planned. Do not connect a mainnet
          wallet or send real funds.
        </p>
      </div>
    </main>
  );
}
