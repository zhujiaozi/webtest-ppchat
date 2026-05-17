package com.ncu.pp.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Base64;
import java.util.UUID;

@Service
public class FileService {

    @Value("${app.upload-dir}")
    private String uploadDir;

    /**
     * 允许上传的图片类型
     */
    private static final java.util.Set<String> ALLOWED_IMAGE_TYPES = java.util.Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"
    );

    /**
     * 允许上传的音频类型
     */
    private static final java.util.Set<String> ALLOWED_AUDIO_TYPES = java.util.Set.of(
            "audio/webm", "audio/ogg", "audio/wav", "audio/mp4", "audio/mpeg"
    );

    /**
     * 最大文件大小（10MB）
     */
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024;

    public String upload(MultipartFile file) throws IOException {
        validateFile(file, ALLOWED_IMAGE_TYPES);
        return doUpload(file);
    }

    /**
     * 上传音频文件（语音消息）
     */
    public String uploadAudio(MultipartFile file) throws IOException {
        validateFile(file, ALLOWED_AUDIO_TYPES);
        return doUpload(file);
    }

    /**
     * 将 Base64 编码的音频数据保存为文件，返回 URL 路径
     */
    public String saveBase64Audio(String base64Data) throws IOException {
        // 解析 data URI: data:audio/webm;base64,xxxxx
        String[] parts = base64Data.split(",");
        String header = parts[0];
        String data = parts.length > 1 ? parts[1] : parts[0];

        String mimeType = "audio/webm";
        if (header.contains(":") && header.contains(";")) {
            mimeType = header.substring(header.indexOf(":") + 1, header.indexOf(";"));
        }

        String extension = switch (mimeType) {
            case "audio/webm" -> ".webm";
            case "audio/ogg" -> ".ogg";
            case "audio/wav" -> ".wav";
            case "audio/mp4" -> ".m4a";
            case "audio/mpeg" -> ".mp3";
            default -> ".webm";
        };

        byte[] audioBytes = Base64.getDecoder().decode(data);

        // 校验大小
        if (audioBytes.length > MAX_FILE_SIZE) {
            throw new IOException("音频文件大小超过限制（10MB）");
        }

        Path projectRoot = Paths.get(System.getProperty("user.dir")).toAbsolutePath();
        Path dir = projectRoot.resolve(uploadDir).resolve("audio");
        if (!Files.exists(dir)) Files.createDirectories(dir);

        String filename = UUID.randomUUID() + extension;
        Path filepath = dir.resolve(filename);
        Files.write(filepath, audioBytes);

        return "/uploads/audio/" + filename;
    }

    private void validateFile(MultipartFile file, java.util.Set<String> allowedTypes) throws IOException {
        if (file.isEmpty()) {
            throw new IOException("文件不能为空");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IOException("文件大小超过限制（10MB）");
        }
        String contentType = file.getContentType();
        if (contentType == null || !allowedTypes.contains(contentType)) {
            throw new IOException("不支持的文件类型: " + contentType + "，允许的类型: " + allowedTypes);
        }
    }

    private String doUpload(MultipartFile file) throws IOException {
        Path projectRoot = Paths.get(System.getProperty("user.dir")).toAbsolutePath();
        Path dir = projectRoot.resolve(uploadDir);
        if (!Files.exists(dir)) Files.createDirectories(dir);

        String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path filepath = dir.resolve(filename);
        file.transferTo(filepath.toFile());
        return "/uploads/" + filename;
    }
}
