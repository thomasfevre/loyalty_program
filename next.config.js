module.exports = {
    reactStrictMode: true,
    images: {
      remotePatterns: [
        {
          protocol: "https",
          hostname: "ipfs.io",
          pathname: "/ipfs/**",
        },
      ],
    },
  };