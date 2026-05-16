package com.ncu.pp.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class FileService {

    @Value("${app.upload-dir}")
    private String uploadDir;

    public String upload(MultipartFile file) throws IOException {
        Path dir = Paths.get(uploadDir);
        if (!Files.exists(dir)) Files.createDirectories(dir);
        String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path filepath = dir.resolve(filename);
        file.transferTo(filepath.toFile());
        return "/uploads/" + filename;
    }
}
