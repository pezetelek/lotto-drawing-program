package lotto.drawing.program.draw;

public enum GameType {
    LOTTO(6, 49, 0, 0),
    MINI_LOTTO(5, 42, 0, 0),
    EURO_JACKPOT(5, 50, 2, 12);

    private final int numbersToPick;
    private final int maxNumber;
    private final int extraNumbersToPick;
    private final int maxExtraNumber;

    GameType(int numbersToPick, int maxNumber, int extraNumbersToPick, int maxExtraNumber) {
        this.numbersToPick = numbersToPick;
        this.maxNumber = maxNumber;
        this.extraNumbersToPick = extraNumbersToPick;
        this.maxExtraNumber = maxExtraNumber;
    }

    public int getNumbersToPick() {
        return numbersToPick;
    }

    public int getMaxNumber() {
        return maxNumber;
    }

    public int getExtraNumbersToPick() {
        return extraNumbersToPick;
    }

    public int getMaxExtraNumber() {
        return maxExtraNumber;
    }

    public boolean hasExtraNumbers() {
        return extraNumbersToPick > 0;
    }
}
