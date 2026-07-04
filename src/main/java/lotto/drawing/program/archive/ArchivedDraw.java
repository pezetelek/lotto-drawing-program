package lotto.drawing.program.archive;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lotto.drawing.program.draw.GameType;

@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"game_type", "draw_date"}))
public class ArchivedDraw {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "game_type", nullable = false)
    private GameType gameType;

    @Column(name = "draw_date", nullable = false)
    private LocalDate drawDate;

    @ElementCollection
    @CollectionTable(name = "archived_draw_numbers", joinColumns = @JoinColumn(name = "archived_draw_id"))
    @OrderColumn(name = "position")
    @Column(name = "number_value", nullable = false)
    private List<Integer> numbers = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "archived_draw_extra_numbers", joinColumns = @JoinColumn(name = "archived_draw_id"))
    @OrderColumn(name = "position")
    @Column(name = "number_value", nullable = false)
    private List<Integer> extraNumbers = new ArrayList<>();

    protected ArchivedDraw() {
    }

    ArchivedDraw(GameType gameType, LocalDate drawDate, List<Integer> numbers, List<Integer> extraNumbers) {
        this.gameType = gameType;
        this.drawDate = drawDate;
        this.numbers = new ArrayList<>(numbers);
        this.extraNumbers = new ArrayList<>(extraNumbers);
    }

    public Long getId() {
        return id;
    }

    public GameType getGameType() {
        return gameType;
    }

    public LocalDate getDrawDate() {
        return drawDate;
    }

    public List<Integer> getNumbers() {
        return numbers;
    }

    public List<Integer> getExtraNumbers() {
        return extraNumbers;
    }
}
