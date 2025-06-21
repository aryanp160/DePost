# 🐦 Depost

**Decentralized. User-owned. Censorship-proof.**

**Depost** is a Twitter-style social media platform where *you* truly own your content. Tweets (a.k.a. posts) are stored on **your IPFS storage**, not on a centralized server. You post it. You own it. You delete it. No one else can.

---

## ✨ Key Features

- 🔒 **Your Content, Your Rules** – Posts are stored on your personal IPFS storage (e.g., via Pinata, Web3Storage, or your own node).
- 🆓 **Censorship-Free** – No central authority to remove or shadowban your content.
- 💼 **Wallet-Based Login** – Connect with MetaMask or any wallet to verify identity and ownership.
- 📡 **Decentralized Feed** – Pulls posts directly from peer IPFS nodes.
- 📦 **Fully Open Source** – Fork it. Run it. Host it yourself.
- 🔗 **Interoperable** – Can be extended with other dApps, smart contracts, or community layers.

---

## 🧠 How It Works

1. Connect your crypto wallet
2. Write a tweet-like post
3. The post is uploaded to your IPFS storage
4. A content hash is shared to the global feed
5. Everyone sees your post, but only you control it

---

## 💻 Tech Stack

- **Frontend**: React + TailwindCSS
- **IPFS**: Pinata / Web3.Storage / Self-hosted nodes
- **Auth**: WalletConnect / MetaMask
- **Backend**: Minimal or optional – peer-to-peer indexing
- **Optional Smart Contracts**: Post index registry (EVM)

---

## 🚀 Getting Started

```bash
git clone https://github.com/yourusername/depost.git
cd depost
npm install
npm run dev
