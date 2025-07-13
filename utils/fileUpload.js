const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const UPLOAD_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Allowed file types
const FILE_TYPES = {
  pdf: ['application/pdf'],
  video: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-matroska'],
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
};

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;
  // Accept pdf, video, image
  const allowed = [
    ...FILE_TYPES.pdf,
    ...FILE_TYPES.video,
    ...FILE_TYPES.image,
  ];
  if (allowed.includes(mime)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, video, and image files are allowed.'));
  }
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const unique = `${base}-${Date.now()}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
});

module.exports = upload; 