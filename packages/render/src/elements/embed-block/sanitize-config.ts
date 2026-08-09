import sanitizeHtml from "sanitize-html";

export const SANITIZE_CONFIG: sanitizeHtml.IOptions = {
  allowedTags: ["iframe"],
  allowedAttributes: {
    iframe: [
      "class",
      "src",
      "allow",
      "allowfullscreen",
      "frameborder",
      "height",
      "loading",
      "referrerpolicy",
      "sandbox",
      "title",
      "width",
    ],
  },
  allowedSchemes: ["https"],
};
