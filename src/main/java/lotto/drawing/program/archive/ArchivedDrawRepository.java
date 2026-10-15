package lotto.drawing.program.archive;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import lotto.drawing.program.draw.GameType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ArchivedDrawRepository extends JpaRepository<ArchivedDraw, Long> {

    List<ArchivedDraw> findByGameTypeOrderByDrawDateDesc(GameType gameType);

    Optional<ArchivedDraw> findFirstByGameTypeOrderByDrawDateDescDrawNumberDesc(GameType gameType);

    @Query(value = """
            SELECT CONCAT(
                GROUP_CONCAT(n.number_value ORDER BY n.number_value SEPARATOR ','),
                ':',
                COALESCE((
                    SELECT GROUP_CONCAT(e.number_value ORDER BY e.number_value SEPARATOR ',')
                    FROM lottery_draw_extra_number e
                    WHERE e.draw_id = d.id
                ), '')
            )
            FROM lottery_draw d
            JOIN lottery_draw_number n ON n.draw_id = d.id
            WHERE d.game_type = :gameType
            GROUP BY d.id
            """, nativeQuery = true)
    List<String> findNumberSignaturesByGameType(@Param("gameType") String gameType);

    boolean existsByGameTypeAndDrawDate(GameType gameType, LocalDate drawDate);

    boolean existsByGameTypeAndDrawNumber(GameType gameType, Long drawNumber);
}
