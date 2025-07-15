### **Informe Técnico del Proyecto de Trazabilidad Alimentaria con Blockchain**

**Objetivo del Documento:** Explicar la arquitectura, el funcionamiento y las decisiones de diseño de la red blockchain del proyecto, destinado a un desarrollador junior que necesita defenderlo.

---

#### **1. Introducción: ¿Qué problema resolvemos y por qué Blockchain?**

El objetivo principal de este proyecto es crear un sistema de **trazabilidad alimentaria**. Esto significa que queremos poder seguir el rastro de un producto alimenticio (por ejemplo, un lote de manzanas) desde su origen (el agricultor) hasta el consumidor final, pasando por todos los intermediarios (transportista, almacén, supermercado).

**¿Por qué usar Blockchain?**
La industria alimentaria sufre de falta de transparencia y confianza. Es difícil verificar si un producto es realmente "orgánico" o de un origen específico. Blockchain nos ofrece tres propiedades clave que atacan este problema:

1.  **Inmutabilidad:** Una vez que un dato se registra en la blockchain (ej: "Lote de manzanas cosechado por Agricultor X"), es prácticamente imposible modificarlo o borrarlo. Esto combate el fraude.
2.  **Transparencia (Controlada):** Todos los participantes autorizados de la red (agricultor, transportista, etc.) ven la misma versión de la historia del producto. No hay disputas sobre "quién dijo qué".
3.  **Trazabilidad:** Como cada paso se registra como una transacción en una cadena, podemos reconstruir la historia completa de un producto simplemente recorriendo esa cadena.

---

#### **2. La Elección Tecnológica: Hyperledger Fabric vs. Ethereum**

Una de las primeras preguntas que podrían hacerte es: **"¿Por qué usaron Hyperledger Fabric y no Ethereum?"**

*   **Ethereum:** Es una blockchain **pública** y **permisionada**. Cualquiera puede unirse, ver las transacciones y desplegar contratos. Su objetivo principal son las aplicaciones descentralizadas abiertas y las criptomonedas (Ether).
*   **Hyperledger Fabric:** Es una blockchain **privada** y **permisionada**. No cualquiera puede unirse. Necesitas una invitación (un certificado digital) para participar. Está diseñada para casos de uso empresariales (B2B) donde la privacidad y el control de acceso son cruciales.

**Nuestra Elección fue Hyperledger Fabric por estas razones:**

1.  **Privacidad:** No queremos que el público general vea los detalles de las operaciones logísticas entre empresas (precios, cantidades, fechas de entrega). Fabric nos permite crear "canales" donde solo los participantes involucrados en una transacción pueden ver los datos.
2.  **Permisionada:** En una cadena de suministro, las identidades son conocidas y deben ser verificadas. No queremos actores anónimos. En Fabric, cada participante (empresa, usuario) tiene una identidad criptográfica (un certificado X.509) emitida por una Autoridad de Certificación (CA). Sabemos quién es quién.
3.  **Sin Costo por Transacción (Gas):** En Ethereum, cada transacción tiene un costo (gas) que se paga en Ether. En un entorno empresarial con miles de transacciones diarias, esto sería inviable. Fabric no tiene este concepto; los costos son operacionales (servidores, mantenimiento).
4.  **Rendimiento:** Fabric está diseñado para un alto volumen de transacciones por segundo, algo esencial para una aplicación empresarial.

En resumen: **Elegimos Fabric porque nuestro caso de uso es un consorcio de empresas que se conocen y necesitan colaborar de forma privada y eficiente, no una red pública y anónima.**

---

#### **3. Arquitectura de la Red: Peers, Chaincode y CCaaS**

Imagina la red de Fabric como un club privado y exclusivo.

**a) Los Peers (Nodos Pares)**

*   **¿Qué son?** Son los servidores fundamentales de la red, gestionados por cada organización (ej: un peer para la empresa de agricultura, un peer para la de logística).
*   **¿Qué hacen?** Tienen dos trabajos principales:
    1.  **Almacenar el Ledger:** El "ledger" es el libro de contabilidad, la base de datos de la blockchain. Cada peer tiene una copia de este libro, lo que garantiza la descentralización y la resiliencia. Si un peer se cae, la red sigue funcionando.
    2.  **Ejecutar el Chaincode:** El "chaincode" son las reglas del negocio (lo veremos a continuación). El peer ejecuta estas reglas para validar las transacciones antes de que se añadan al ledger.

**b) El Chaincode (Nuestro "Contrato Inteligente")**

*   **¿Qué es?** Es el programa que contiene la lógica de negocio. En nuestro proyecto, el fichero `chaincode/src/contracts/FoodTraceabilityContract.ts` es el corazón del sistema.
*   **¿Qué hace?** Define las funciones que se pueden ejecutar en la blockchain. Por ejemplo:
    *   `createFood(id, name, producer)`: Para que un agricultor registre un nuevo producto.
    *   `transferFood(id, newOwner)`: Para transferir la propiedad del producto a un transportista.
    *   `updateFoodLocation(id, location)`: Para registrar el paso del producto por un almacén.
    *   `getFoodHistory(id)`: Para que un consumidor consulte toda la historia del producto.
*   **¿Cómo se ha creado?** Está escrito en **TypeScript**, lo que facilita el desarrollo y la mantenibilidad. Utiliza el SDK de Fabric para interactuar con el ledger.

**c) Chaincode as a Service (CCaaS)**

Esta es una característica moderna y muy importante de Fabric que estamos utilizando.

*   **El "cómo" tradicional:** Antes, el chaincode se instalaba directamente dentro del proceso del peer. Esto era complicado de actualizar y podía comprometer la seguridad del peer si el chaincode tenía un error.
*   **El "cómo" de CCaaS (nuestro enfoque):** El chaincode se ejecuta en su propio **contenedor de Docker**, separado del peer. El peer simplemente se comunica con este contenedor a través de una red segura.
*   **¿Por qué es mejor (su utilidad)?**
    1.  **Seguridad:** Un fallo en el chaincode no tumba al peer. Están aislados.
    2.  **Flexibilidad:** Podemos actualizar el chaincode sin tener que reiniciar o modificar el peer. El ciclo de vida es independiente.
    3.  **Multi-lenguaje:** Facilita que el chaincode se escriba en diferentes lenguajes (Go, Node.js/TypeScript, Java) sin que el peer tenga que preocuparse por ello.

El script `scripts/deploy-chaincode.sh` automatiza este proceso: empaqueta nuestro chaincode de TypeScript, lo instala en los peers y lo "lanza" en su propio contenedor como un servicio.

---

#### **4. La API: La Puerta de Entrada al Mundo Blockchain**

Los usuarios finales (un agricultor con una tablet, un consumidor con un móvil) no interactúan directamente con la red de Fabric. Sería demasiado complejo y requeriría que cada usuario tuviera credenciales criptográficas.

Aquí es donde entra nuestra **API REST**.

*   **¿Qué es?** Es un servidor web (escrito en TypeScript con Node.js/Express) que actúa como intermediario. El código clave está en `api/src/app.ts` y los controladores en `api/src/controllers/`.
*   **¿Cuál es su utilidad?**
    1.  **Simplificación:** Ofrece endpoints sencillos y familiares para las aplicaciones cliente (web y móvil). Por ejemplo, una petición `POST /api/food` es mucho más simple que construir una transacción de Fabric a mano.
    2.  **Abstracción:** Oculta la complejidad de la blockchain. El frontend no necesita saber qué es un peer o un chaincode.
    3.  **Gestión de Identidades:** Es la responsable de la autenticación, como veremos a continuación.

---

#### **5. Autenticación: Un Proceso en Dos Niveles**

La autenticación es una de las partes más importantes y que demuestra un buen entendimiento del sistema.

**Nivel 1: Autenticación de Usuario (Frontend -> API)**

*   **¿Cómo funciona?** Es una autenticación web estándar. Un usuario se registra en nuestro sistema con un email y una contraseña. Al iniciar sesión, la API le devuelve un **token JWT (JSON Web Token)**.
*   **¿Para qué sirve?** Para cada petición que el usuario hace a la API (ej: registrar un producto), adjunta este token. La API (usando middleware como `authMiddleware.ts`) verifica que el token sea válido y que el usuario tenga permisos para hacer esa acción (ej: solo los usuarios con rol "productor" pueden crear alimentos, gestionado por `roleAuthMiddleware.ts`).

**Nivel 2: Autenticación de la Aplicación (API -> Blockchain)**

*   **¿Cómo funciona?** La API no es un usuario anónimo para la red de Fabric. **La API es, en sí misma, un participante de la red con su propia identidad criptográfica.**
*   Cuando instalamos la aplicación, generamos un **certificado X.509** para ella y lo guardamos en un lugar seguro llamado "wallet" (ver el directorio `wallet/`).
*   Cada vez que la API necesita ejecutar una transacción en el chaincode (porque un usuario autenticado se lo pidió), la API "firma" esa petición con su certificado privado.
*   **¿Para qué sirve?** Los peers de la red de Fabric reciben la petición, ven la firma digital de la API y verifican que proviene de una fuente autorizada. Esto es lo que realmente da seguridad a nivel de blockchain. El fichero `api/src/middleware/x509AuthMiddleware.ts` (si se usa para validar clientes con certificados) o más probablemente el `FabricGatewayService.ts` es donde se carga la identidad de la wallet para conectar con Fabric.

**En resumen:** El usuario se autentica en la API con usuario/contraseña (JWT), y la API se autentica en la Blockchain con un certificado digital (X.509).

---

#### **6. Flujo de Trabajo Completo (Ejemplo Práctico)**

Para defender el proyecto, usa un ejemplo:

1.  **Registro:** Un agricultor, desde la aplicación web, rellena un formulario para registrar un nuevo lote de "Manzanas Fuji".
2.  **Petición a la API:** El frontend envía una petición `POST /api/food` con los datos de las manzanas y el token JWT del agricultor en la cabecera.
3.  **Validación en la API:** La API recibe la petición.
    *   El `authMiddleware` valida el JWT. Es correcto.
    *   El `roleAuthMiddleware` comprueba que el usuario tiene el rol "productor". Lo tiene.
4.  **Interacción con Fabric:**
    *   El `FoodController` llama al `FabricGatewayService`.
    *   El servicio carga la identidad de la API desde la "wallet".
    *   Se conecta al "gateway" de Fabric y especifica el canal y el chaincode que quiere usar.
    *   Envía una transacción para ejecutar la función `createFood` del chaincode, pasando los datos de las manzanas. La transacción va firmada digitalmente por la API.
5.  **Proceso en la Blockchain:**
    *   Los peers reciben la propuesta de transacción.
    *   Ejecutan la función `createFood` en el contenedor del chaincode (CCaaS) para simular el resultado.
    *   Verifican que la firma (de la API) sea válida.
    *   Si todo es correcto, envían la transacción al servicio de ordenación, que la "empaqueta" en un nuevo bloque.
    *   El nuevo bloque se distribuye a todos los peers de la red, que lo añaden a su copia del ledger. ¡Las manzanas ya existen oficialmente en la blockchain!
6.  **Respuesta al Usuario:** La API recibe la confirmación de que la transacción fue exitosa y devuelve un código `201 Created` al frontend. El agricultor ve un mensaje de "Producto registrado con éxito".

---

#### **Conclusión para la Defensa**

Este proyecto implementa una solución robusta y segura para la trazabilidad alimentaria utilizando Hyperledger Fabric. Las decisiones clave fueron:

*   **Usar Fabric** por su naturaleza privada y permisionada, ideal para un entorno B2B.
*   **Desplegar el Chaincode como un Servicio (CCaaS)** para mejorar la seguridad y la flexibilidad operativa.
*   **Crear una API REST** como intermediaria para simplificar la interacción del usuario y abstraer la complejidad de la blockchain.
*   **Implementar un sistema de autenticación de dos niveles:** JWT para la conveniencia del usuario y certificados X.509 para la seguridad de la red blockchain.

El resultado es un sistema que genera **confianza, transparencia e inmutabilidad** en la cadena de suministro de alimentos, resolviendo un problema real del sector.
