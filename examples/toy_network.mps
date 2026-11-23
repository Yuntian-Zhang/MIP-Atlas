NAME          TOY_NETWORK
OBJSENSE
 MIN
ROWS
 N  COST
 L  CAP_A
 G  DEMAND_B
 E  BALANCE_C
COLUMNS
 X_1       COST      2       CAP_A      1
 X_1       BALANCE_C 1
 X_2       COST      3       CAP_A      1
 X_2       DEMAND_B  1
 X_3       COST      1       DEMAND_B  1
 X_3       BALANCE_C -1
 X_4       COST      4       BALANCE_C 1
RHS
 RHS1      CAP_A     10      DEMAND_B   4
 RHS1      BALANCE_C 0
BOUNDS
 BV BND1   X_1
 LO BND1   X_2       0
 UP BND1   X_2       8
 BV BND1   X_3
 UP BND1   X_4       5
ENDATA
