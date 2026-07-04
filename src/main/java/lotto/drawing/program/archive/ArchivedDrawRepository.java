package lotto.drawing.program.archive;

import java.time.LocalDate;
import java.util.List;
import lotto.drawing.program.draw.GameType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ArchivedDrawRepository extends JpaRepository<ArchivedDraw, Long> {

    List<ArchivedDraw> findByGameTypeOrderByDrawDateDesc(GameType gameType);

    boolean existsByGameTypeAndDrawDate(GameType gameType, LocalDate drawDate);
}
