package lotto.drawing.program.archive;

import jakarta.validation.Valid;
import java.util.List;
import lotto.drawing.program.draw.GameType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/archive")
public class ArchiveController {

    private final ArchiveService archiveService;

    public ArchiveController(ArchiveService archiveService) {
        this.archiveService = archiveService;
    }

    @GetMapping
    public List<ArchivedDrawDto> findByGameType(@RequestParam GameType gameType) {
        return archiveService.findByGameType(gameType);
    }

    @PostMapping
    public ArchivedDrawDto create(@Valid @RequestBody ArchivedDrawRequest request) {
        return archiveService.create(request);
    }

    @PostMapping("/import")
    public ArchiveImportResultDto importCsv(@RequestParam("file") MultipartFile file) {
        return archiveService.importCsv(file);
    }
}
