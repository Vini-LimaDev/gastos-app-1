@echo off
echo ==============================================
echo    GastosApp - Configuracao do Git
echo ==============================================
echo.

:: Verifica se git está instalado
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: Git nao encontrado. Instale em https://git-scm.com
    pause
    exit /b 1
)

:: Inicializa o repositório
echo [1/4] Inicializando repositorio Git...
git init
git branch -M main

:: Adiciona todos os arquivos
echo [2/4] Adicionando arquivos...
git add .

:: Faz o primeiro commit
echo [3/4] Criando primeiro commit...
git commit -m "feat: initial commit - GastosApp"

echo.
echo ==============================================
echo  Pronto! Repositorio local criado com sucesso.
echo ==============================================
echo.
echo Agora faca o seguinte:
echo.
echo  1. Va em https://github.com/new
echo  2. Crie um repositorio chamado "gastos-app"
echo  3. NAO marque nenhuma opcao (sem README, sem .gitignore)
echo  4. Copie a URL do repositorio e rode os comandos:
echo.
echo     git remote add origin https://github.com/SEU_USUARIO/gastos-app.git
echo     git push -u origin main
echo.
pause
